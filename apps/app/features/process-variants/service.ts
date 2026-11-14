import { writeAuditLog } from "@mqdms/audit";
import { type AuthContext, hasPermission } from "@mqdms/auth/permissions/server";
import { db } from "@mqdms/db";
import { process, processVariant, processVariantRevision } from "@mqdms/db/schema";
import { and, eq } from "drizzle-orm";

import { getRevisionGraph } from "@/features/flow-editor/repository";
import { validateGraph } from "@/features/flow-editor/validation";

import { canTransition } from "./lifecycle";
import {
  findProcessVariantByCode,
  findProcessVariantRevisionByValue,
  getProcessVariant,
  getProcessVariantRevision,
} from "./repository";
import type { ProcessVariantFormValues, ProcessVariantRevisionFormValues } from "./schema";

/**
 * Process Variant servisi.
 *
 * Varyantın teknik içeriği revision üzerinden yönetilir. Revision yaşam
 * döngüsü açık bir state machine ile uygulanır:
 *
 * ```text
 * DRAFT → IN_REVIEW → APPROVED → RELEASED → SUPERSEDED
 * IN_REVIEW → DRAFT
 * APPROVED → DRAFT (gerekçeli geri alma)
 * ```
 */

/** İş kuralı ihlali. */
export class ProcessVariantRuleError extends Error {
  constructor(
    message: string,
    readonly code:
      | "NOT_FOUND"
      | "CONFLICT"
      | "INVALID_INPUT"
      | "FORBIDDEN"
      | "INVALID_STATE"
      | "GRAPH_INVALID" = "INVALID_INPUT",
    /** Hata kodları; kullanıcıya çevrilmek üzere saklanır. */
    readonly details: string[] = [],
  ) {
    super(message);
    this.name = "ProcessVariantRuleError";
  }
}

/** Revision durumu. */
type RevisionStatus = "DRAFT" | "IN_REVIEW" | "APPROVED" | "RELEASED" | "SUPERSEDED";

/**
 * Geçişin izinli olup olmadığını denetler.
 *
 * Geçişler dışarıdan gelen durumla değil, mevcut durumla doğrulanır: eski bir
 * ekrandan gelen mutation yayınlanmış bir revision'ı değiştiremez.
 */
function assertTransition(from: RevisionStatus, to: RevisionStatus): void {
  if (!canTransition(from, to)) {
    throw new ProcessVariantRuleError(
      `Revision ${from} durumundan ${to} durumuna geçemez.`,
      "INVALID_STATE",
    );
  }
}

/**
 * `masterProcesses:manageVariants` yetkisinin kapsadığı varyant işlemleri.
 *
 * Ana proses kütüphanesini yöneten roller varyantları da yönetebilir:
 * katalogda iki yol tanımlıdır ve ikisi de geçerlidir.
 */
const MANAGE_VARIANT_ACTIONS = new Set(["create", "update", "archive", "restore"]);

/** Yetki kontrolü. */
async function requireVariantPermission(context: AuthContext, action: string): Promise<void> {
  if (await hasPermission(context, "processVariants", action)) {
    return;
  }

  if (
    MANAGE_VARIANT_ACTIONS.has(action) &&
    (await hasPermission(context, "masterProcesses", "manageVariants"))
  ) {
    return;
  }

  throw new ProcessVariantRuleError("Bu işlem için yetkiniz yok.", "FORBIDDEN");
}

/** Boş string'i `null`'a çevirir. */
function toNull(value: string | undefined): string | null {
  if (value === undefined) {
    return null;
  }

  const trimmed = value.trim();

  return trimmed === "" ? null : trimmed;
}

/**
 * Revision'ın düzenlenebilir olduğunu doğrular.
 *
 * Yayınlanmış (`RELEASED`) revision'ın teknik içeriği değiştirilemez: eski bir
 * ekrandan gelen mutation reddedilir.
 */
export async function assertRevisionEditable(
  context: AuthContext,
  revisionId: string,
): Promise<{ id: string; processVariantId: string; version: number }> {
  const revision = await getProcessVariantRevision(context.organizationId, revisionId);

  if (!revision) {
    throw new ProcessVariantRuleError("Revision bulunamadı.", "NOT_FOUND");
  }

  if (revision.status !== "DRAFT") {
    throw new ProcessVariantRuleError(
      "Yayınlanmış revision'ın teknik içeriği değiştirilemez.",
      "INVALID_STATE",
    );
  }

  return {
    id: revision.id,
    processVariantId: revision.processVariantId,
    version: revision.version,
  };
}

/**
 * Process Variant oluşturur.
 *
 * Varyant kodu organizasyon kapsamında case-insensitive unique'tir.
 */
export async function createProcessVariant(
  context: AuthContext,
  input: ProcessVariantFormValues,
): Promise<string> {
  await requireVariantPermission(context, "create");

  const existing = await findProcessVariantByCode(context.organizationId, input.code);

  if (existing) {
    throw new ProcessVariantRuleError("Bu varyant kodu zaten kullanılıyor.", "CONFLICT");
  }

  return db.transaction(async (tx) => {
    const parent = await tx
      .select({ id: process.id })
      .from(process)
      .where(
        and(eq(process.organizationId, context.organizationId), eq(process.id, input.processId)),
      )
      .limit(1);

    if (!parent[0]) {
      throw new ProcessVariantRuleError("Proses bulunamadı.", "NOT_FOUND");
    }

    const created = await tx
      .insert(processVariant)
      .values({
        organizationId: context.organizationId,
        processId: input.processId,
        code: input.code,
        name: input.name,
        description: toNull(input.description),
        variantType: input.variantType,
        status: input.status,
        createdById: context.userId,
      })
      .returning({ id: processVariant.id });

    const variantId = created[0]?.id;

    if (!variantId) {
      throw new ProcessVariantRuleError("Varyant oluşturulamadı.", "INVALID_INPUT");
    }

    await writeAuditLog(
      {
        organizationId: context.organizationId,
        actorId: context.userId,
        action: "processVariant.created",
        target: { type: "processVariant", id: variantId },
        metadata: {
          processId: input.processId,
          code: input.code,
          name: input.name,
          variantType: input.variantType,
        },
      },
      tx,
    );

    return variantId;
  });
}

/** Process Variant'i günceller. */
export async function updateProcessVariant(
  context: AuthContext,
  variantId: string,
  input: ProcessVariantFormValues,
): Promise<void> {
  await requireVariantPermission(context, "update");

  const target = await getProcessVariant(context.organizationId, variantId);

  if (!target) {
    throw new ProcessVariantRuleError("Varyant bulunamadı.", "NOT_FOUND");
  }

  const existing = await findProcessVariantByCode(context.organizationId, input.code, variantId);

  if (existing) {
    throw new ProcessVariantRuleError("Bu varyant kodu zaten kullanılıyor.", "CONFLICT");
  }

  await db.transaction(async (tx) => {
    await tx
      .update(processVariant)
      .set({
        code: input.code,
        name: input.name,
        description: toNull(input.description),
        variantType: input.variantType,
        status: input.status,
      })
      .where(
        and(
          eq(processVariant.organizationId, context.organizationId),
          eq(processVariant.id, variantId),
        ),
      );

    await writeAuditLog(
      {
        organizationId: context.organizationId,
        actorId: context.userId,
        action: "processVariant.updated",
        target: { type: "processVariant", id: variantId },
        metadata: { code: input.code, name: input.name, variantType: input.variantType },
      },
      tx,
    );
  });
}

/** Process Variant'i arşivler. */
export async function archiveProcessVariant(
  context: AuthContext,
  variantId: string,
): Promise<void> {
  await requireVariantPermission(context, "archive");

  const target = await getProcessVariant(context.organizationId, variantId);

  if (!target) {
    throw new ProcessVariantRuleError("Varyant bulunamadı.", "NOT_FOUND");
  }

  await db.transaction(async (tx) => {
    await tx
      .update(processVariant)
      .set({ archivedAt: new Date() })
      .where(
        and(
          eq(processVariant.organizationId, context.organizationId),
          eq(processVariant.id, variantId),
        ),
      );

    await writeAuditLog(
      {
        organizationId: context.organizationId,
        actorId: context.userId,
        action: "processVariant.archived",
        target: { type: "processVariant", id: variantId },
        metadata: { code: target.code, name: target.name },
      },
      tx,
    );
  });
}

/** Arşivlenen Process Variant'i geri alır. */
export async function restoreProcessVariant(
  context: AuthContext,
  variantId: string,
): Promise<void> {
  await requireVariantPermission(context, "restore");

  const target = await getProcessVariant(context.organizationId, variantId);

  if (!target) {
    throw new ProcessVariantRuleError("Varyant bulunamadı.", "NOT_FOUND");
  }

  await db.transaction(async (tx) => {
    await tx
      .update(processVariant)
      .set({ archivedAt: null })
      .where(
        and(
          eq(processVariant.organizationId, context.organizationId),
          eq(processVariant.id, variantId),
        ),
      );

    await writeAuditLog(
      {
        organizationId: context.organizationId,
        actorId: context.userId,
        action: "processVariant.restored",
        target: { type: "processVariant", id: variantId },
        metadata: { code: target.code, name: target.name },
      },
      tx,
    );
  });
}

/**
 * Yeni revision oluşturur.
 *
 * Revision değeri varyant içinde unique'tir. Yeni revision, mevcut yayınlanmış
 * revision'ı geçersiz kılar (`supersedesRevisionId`).
 */
export async function createProcessVariantRevision(
  context: AuthContext,
  variantId: string,
  input: ProcessVariantRevisionFormValues,
): Promise<string> {
  await requireVariantPermission(context, "update");

  const variant = await getProcessVariant(context.organizationId, variantId);

  if (!variant) {
    throw new ProcessVariantRuleError("Varyant bulunamadı.", "NOT_FOUND");
  }

  const existing = await findProcessVariantRevisionByValue(
    context.organizationId,
    variantId,
    input.revision,
  );

  if (existing) {
    throw new ProcessVariantRuleError("Bu revision değeri zaten kullanılıyor.", "CONFLICT");
  }

  return db.transaction(async (tx) => {
    const released = await tx
      .select({ id: processVariantRevision.id })
      .from(processVariantRevision)
      .where(
        and(
          eq(processVariantRevision.organizationId, context.organizationId),
          eq(processVariantRevision.processVariantId, variantId),
          eq(processVariantRevision.status, "RELEASED"),
        ),
      )
      .limit(1);

    const created = await tx
      .insert(processVariantRevision)
      .values({
        organizationId: context.organizationId,
        processVariantId: variantId,
        revision: input.revision,
        description: toNull(input.description),
        changeReason: toNull(input.changeReason),
        status: "DRAFT",
        supersedesRevisionId: released[0]?.id ?? null,
        createdById: context.userId,
      })
      .returning({ id: processVariantRevision.id });

    const revisionId = created[0]?.id;

    if (!revisionId) {
      throw new ProcessVariantRuleError("Revision oluşturulamadı.", "INVALID_INPUT");
    }

    await writeAuditLog(
      {
        organizationId: context.organizationId,
        actorId: context.userId,
        action: "processVariantRevision.created",
        target: { type: "processVariantRevision", id: revisionId },
        metadata: {
          processVariantId: variantId,
          revision: input.revision,
          supersedesRevisionId: released[0]?.id ?? null,
        },
      },
      tx,
    );

    return revisionId;
  });
}

/** Revision'ı incelemeye gönderir (`DRAFT → IN_REVIEW`). */
export async function submitProcessVariantRevision(
  context: AuthContext,
  revisionId: string,
): Promise<void> {
  await requireVariantPermission(context, "submit");

  const revision = await getProcessVariantRevision(context.organizationId, revisionId);

  if (!revision) {
    throw new ProcessVariantRuleError("Revision bulunamadı.", "NOT_FOUND");
  }

  assertTransition(revision.status, "IN_REVIEW");

  await db.transaction(async (tx) => {
    await tx
      .update(processVariantRevision)
      .set({ status: "IN_REVIEW", submittedAt: new Date(), submittedById: context.userId })
      .where(
        and(
          eq(processVariantRevision.organizationId, context.organizationId),
          eq(processVariantRevision.id, revisionId),
        ),
      );

    await writeAuditLog(
      {
        organizationId: context.organizationId,
        actorId: context.userId,
        action: "processVariantRevision.submitted",
        target: { type: "processVariantRevision", id: revisionId },
        metadata: {
          processVariantId: revision.processVariantId,
          revision: revision.revision,
        },
      },
      tx,
    );
  });
}

/** Revision'ı onaylar (`IN_REVIEW → APPROVED`). */
export async function approveProcessVariantRevision(
  context: AuthContext,
  revisionId: string,
): Promise<void> {
  await requireVariantPermission(context, "approve");

  const revision = await getProcessVariantRevision(context.organizationId, revisionId);

  if (!revision) {
    throw new ProcessVariantRuleError("Revision bulunamadı.", "NOT_FOUND");
  }

  assertTransition(revision.status, "APPROVED");

  await db.transaction(async (tx) => {
    await tx
      .update(processVariantRevision)
      .set({ status: "APPROVED", approvedAt: new Date(), approvedById: context.userId })
      .where(
        and(
          eq(processVariantRevision.organizationId, context.organizationId),
          eq(processVariantRevision.id, revisionId),
        ),
      );

    await writeAuditLog(
      {
        organizationId: context.organizationId,
        actorId: context.userId,
        action: "processVariantRevision.approved",
        target: { type: "processVariantRevision", id: revisionId },
        metadata: {
          processVariantId: revision.processVariantId,
          revision: revision.revision,
        },
      },
      tx,
    );
  });
}

/**
 * Revision'ı gerekçeli olarak geri alır (`IN_REVIEW → DRAFT`).
 *
 * Gerekçe audit kaydında saklanır; revision'ın teknik içeriği korunur.
 */
export async function rejectProcessVariantRevision(
  context: AuthContext,
  revisionId: string,
  reason: string,
): Promise<void> {
  await requireVariantPermission(context, "reject");

  const revision = await getProcessVariantRevision(context.organizationId, revisionId);

  if (!revision) {
    throw new ProcessVariantRuleError("Revision bulunamadı.", "NOT_FOUND");
  }

  assertTransition(revision.status, "DRAFT");

  await db.transaction(async (tx) => {
    await tx
      .update(processVariantRevision)
      .set({ status: "DRAFT", approvedAt: null, approvedById: null })
      .where(
        and(
          eq(processVariantRevision.organizationId, context.organizationId),
          eq(processVariantRevision.id, revisionId),
        ),
      );

    await writeAuditLog(
      {
        organizationId: context.organizationId,
        actorId: context.userId,
        action: "processVariantRevision.rejected",
        target: { type: "processVariantRevision", id: revisionId },
        metadata: {
          processVariantId: revision.processVariantId,
          revision: revision.revision,
          reason,
        },
      },
      tx,
    );
  });
}

/**
 * Revision'ı yayınlar (`APPROVED → RELEASED`).
 *
 * Yayınlama **tek transaction** içinde yapılır: önceki yayınlanmış revision
 * `SUPERSEDED` durumuna geçer. Yayınlanmış revision teknik içerik olarak
 * değiştirilemez.
 */
export async function releaseProcessVariantRevision(
  context: AuthContext,
  revisionId: string,
): Promise<void> {
  await requireVariantPermission(context, "release");

  const revision = await getProcessVariantRevision(context.organizationId, revisionId);

  if (!revision) {
    throw new ProcessVariantRuleError("Revision bulunamadı.", "NOT_FOUND");
  }

  assertTransition(revision.status, "RELEASED");

  /*
   * Yayınlamadan önce grafik tutarlılığı doğrulanır: akış varsa START ve END
   * noktaları tanımlı olmalı, edge'ler aynı akışın node'larına bağlanmalıdır.
   *
   * Akış opsiyonel bir teknik içeriktir; akışı olmayan revision yayınlanabilir.
   * Uyarılar (erişilemeyen node gibi) yayınlamayı engellemez.
   */
  const graph = await getRevisionGraph(context.organizationId, revisionId);

  if (graph) {
    const validation = validateGraph(graph.nodes, graph.edges);

    if (validation.errors.length > 0) {
      const labels = new Map(graph.nodes.map((node) => [node.id, node.title]));

      for (const edge of graph.edges) {
        labels.set(edge.id, edge.label ?? "");
      }

      /*
       * Hata kodları kayıt etiketiyle zenginleştirilir: kullanıcı hangi
       * node'un düzeltilmesi gerektiğini görür.
       */
      const details = validation.errors.map((code) => {
        const separator = code.indexOf(":");

        if (separator === -1) {
          return code;
        }

        const base = code.slice(0, separator);
        const label = labels.get(code.slice(separator + 1));

        return label ? `${base}:${label}` : code;
      });

      throw new ProcessVariantRuleError("Akış doğrulaması başarısız.", "GRAPH_INVALID", details);
    }
  }

  await db.transaction(async (tx) => {
    /*
     * Yayınlanmış revision aynı transaction içinde ve kilitli olarak okunur.
     *
     * Kilit (FOR UPDATE) eşzamanlı iki yayını sıralar: aksi halde iki revision
     * da aynı anda RELEASED olabilirdi. Satır kilidi farklı bağlantı üzerinden
     * okuma yapılmasını da engeller.
     */
    const previous = await tx
      .select({ id: processVariantRevision.id })
      .from(processVariantRevision)
      .where(
        and(
          eq(processVariantRevision.organizationId, context.organizationId),
          eq(processVariantRevision.processVariantId, revision.processVariantId),
          eq(processVariantRevision.status, "RELEASED"),
        ),
      )
      .for("update")
      .limit(1);

    const previousId = previous[0]?.id;

    if (previousId && previousId !== revisionId) {
      await tx
        .update(processVariantRevision)
        .set({ status: "SUPERSEDED" })
        .where(
          and(
            eq(processVariantRevision.organizationId, context.organizationId),
            eq(processVariantRevision.id, previousId),
          ),
        );
    }

    await tx
      .update(processVariantRevision)
      .set({ status: "RELEASED", releasedAt: new Date(), releasedById: context.userId })
      .where(
        and(
          eq(processVariantRevision.organizationId, context.organizationId),
          eq(processVariantRevision.id, revisionId),
        ),
      );

    await writeAuditLog(
      {
        organizationId: context.organizationId,
        actorId: context.userId,
        action: "processVariantRevision.released",
        target: { type: "processVariantRevision", id: revisionId },
        metadata: {
          processVariantId: revision.processVariantId,
          revision: revision.revision,
          supersededRevisionId: previousId ?? null,
        },
      },
      tx,
    );
  });
}
