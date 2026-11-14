import { writeAuditLog } from "@mqdms/audit";
import { type AuthContext, hasPermission } from "@mqdms/auth/permissions/server";
import { db } from "@mqdms/db";
import {
  flowNode,
  flowNodeWorkElement,
  item,
  itemGroup,
  processWorkElement,
} from "@mqdms/db/schema";
import { and, eq } from "drizzle-orm";

import { assertRevisionEditable, lockDraftRevision } from "@/features/process-variants/service";

import { getNodeRevisionId, getWorkElement, listNodeWorkElements } from "./repository";
import type { WorkElementFormValues } from "./schema";

/**
 * Process Work Element servisi.
 *
 * Work Element'ler revision'a bağlıdır ve yalnızca **taslak** revision'da
 * düzenlenebilir. Bir Work Element birden fazla Flow Node ile ilişkilendirilebilir.
 */

/** İş kuralı ihlali. */
export class WorkElementRuleError extends Error {
  constructor(
    message: string,
    readonly code:
      | "NOT_FOUND"
      | "CONFLICT"
      | "INVALID_INPUT"
      | "FORBIDDEN"
      | "INVALID_STATE" = "INVALID_INPUT",
  ) {
    super(message);
    this.name = "WorkElementRuleError";
  }
}

/** Yetki kontrolü. */
async function requireWorkElementPermission(context: AuthContext, action: string): Promise<void> {
  if (!(await hasPermission(context, "processVariants", action))) {
    throw new WorkElementRuleError("Bu işlem için yetkiniz yok.", "FORBIDDEN");
  }
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
 * Item ve item grup referanslarını doğrular.
 *
 * Referanslar aynı organizasyona ait olmak zorundadır.
 */
async function validateReferences(
  organizationId: string,
  input: WorkElementFormValues,
): Promise<void> {
  if (input.itemId) {
    const rows = await db
      .select({ id: item.id })
      .from(item)
      .where(and(eq(item.organizationId, organizationId), eq(item.id, input.itemId)))
      .limit(1);

    if (!rows[0]) {
      throw new WorkElementRuleError("Ürün bulunamadı.", "NOT_FOUND");
    }
  }

  if (input.itemGroupId) {
    const rows = await db
      .select({ id: itemGroup.id })
      .from(itemGroup)
      .where(and(eq(itemGroup.organizationId, organizationId), eq(itemGroup.id, input.itemGroupId)))
      .limit(1);

    if (!rows[0]) {
      throw new WorkElementRuleError("Ürün grubu bulunamadı.", "NOT_FOUND");
    }
  }
}

/** Work Element oluşturur. */
export async function createWorkElement(
  context: AuthContext,
  input: WorkElementFormValues,
): Promise<string> {
  await requireWorkElementPermission(context, "update");

  await assertRevisionEditable(context, input.processVariantRevisionId);

  await validateReferences(context.organizationId, input);

  return db.transaction(async (tx) => {
    /*
     * Revision satırı kilitlenerek düzenlenebilir durumu transaction
     * içinde yeniden doğrulanır: incelemeye gönderilen bir
     * revision'a içerik yazılamaz.
     */
    const editable = await lockDraftRevision(
      tx,
      context.organizationId,
      input.processVariantRevisionId,
    );

    if (!editable) {
      throw new WorkElementRuleError(
        "Revision düzenlenemez; yalnızca taslak revision değiştirilebilir.",
        "INVALID_STATE",
      );
    }
    const created = await tx
      .insert(processWorkElement)
      .values({
        organizationId: context.organizationId,
        processVariantRevisionId: input.processVariantRevisionId,
        logicalId: crypto.randomUUID(),
        code: input.code,
        name: input.name,
        description: toNull(input.description),
        category: input.category,
        itemId: input.itemId,
        itemGroupId: input.itemGroupId,
      })
      .returning({ id: processWorkElement.id });

    const workElementId = created[0]?.id;

    if (!workElementId) {
      throw new WorkElementRuleError("Work element oluşturulamadı.", "INVALID_INPUT");
    }

    await writeAuditLog(
      {
        organizationId: context.organizationId,
        actorId: context.userId,
        action: "processWorkElement.created",
        target: { type: "processWorkElement", id: workElementId },
        metadata: {
          processVariantRevisionId: input.processVariantRevisionId,
          code: input.code,
          name: input.name,
          category: input.category,
        },
      },
      tx,
    );

    return workElementId;
  });
}

/** Work Element'i günceller. */
export async function updateWorkElement(
  context: AuthContext,
  workElementId: string,
  input: WorkElementFormValues,
): Promise<void> {
  await requireWorkElementPermission(context, "update");

  const target = await getWorkElement(context.organizationId, workElementId);

  if (!target) {
    throw new WorkElementRuleError("Work element bulunamadı.", "NOT_FOUND");
  }

  await assertRevisionEditable(context, target.processVariantRevisionId);

  await validateReferences(context.organizationId, input);

  await db.transaction(async (tx) => {
    /*
     * Revision satırı kilitlenerek düzenlenebilir durumu transaction
     * içinde yeniden doğrulanır: incelemeye gönderilen bir
     * revision'a içerik yazılamaz.
     */
    const editable = await lockDraftRevision(
      tx,
      context.organizationId,
      target.processVariantRevisionId,
    );

    if (!editable) {
      throw new WorkElementRuleError(
        "Revision düzenlenemez; yalnızca taslak revision değiştirilebilir.",
        "INVALID_STATE",
      );
    }
    await tx
      .update(processWorkElement)
      .set({
        code: input.code,
        name: input.name,
        description: toNull(input.description),
        category: input.category,
        itemId: input.itemId,
        itemGroupId: input.itemGroupId,
      })
      .where(
        and(
          eq(processWorkElement.organizationId, context.organizationId),
          eq(processWorkElement.id, workElementId),
        ),
      );

    await writeAuditLog(
      {
        organizationId: context.organizationId,
        actorId: context.userId,
        action: "processWorkElement.updated",
        target: { type: "processWorkElement", id: workElementId },
        metadata: { code: input.code, name: input.name, category: input.category },
      },
      tx,
    );
  });
}

/** Work Element'i siler. */
export async function deleteWorkElement(
  context: AuthContext,
  workElementId: string,
): Promise<void> {
  await requireWorkElementPermission(context, "update");

  const target = await getWorkElement(context.organizationId, workElementId);

  if (!target) {
    throw new WorkElementRuleError("Work element bulunamadı.", "NOT_FOUND");
  }

  await assertRevisionEditable(context, target.processVariantRevisionId);

  await db.transaction(async (tx) => {
    /*
     * Revision satırı kilitlenerek düzenlenebilir durumu transaction
     * içinde yeniden doğrulanır: incelemeye gönderilen bir
     * revision'a içerik yazılamaz.
     */
    const editable = await lockDraftRevision(
      tx,
      context.organizationId,
      target.processVariantRevisionId,
    );

    if (!editable) {
      throw new WorkElementRuleError(
        "Revision düzenlenemez; yalnızca taslak revision değiştirilebilir.",
        "INVALID_STATE",
      );
    }
    await tx
      .delete(processWorkElement)
      .where(
        and(
          eq(processWorkElement.organizationId, context.organizationId),
          eq(processWorkElement.id, workElementId),
        ),
      );

    await writeAuditLog(
      {
        organizationId: context.organizationId,
        actorId: context.userId,
        action: "processWorkElement.removed",
        target: { type: "processWorkElement", id: workElementId },
        metadata: { code: target.code, name: target.name },
      },
      tx,
    );
  });
}

/**
 * Work Element'i bir Flow Node'a bağlar.
 *
 * İlişkilendirilen kayıtlar aynı teknik revision kapsamına ait olmalıdır.
 */
export async function attachWorkElementToNode(
  context: AuthContext,
  flowNodeId: string,
  processWorkElementId: string,
): Promise<void> {
  await requireWorkElementPermission(context, "update");

  const workElement = await getWorkElement(context.organizationId, processWorkElementId);

  if (!workElement) {
    throw new WorkElementRuleError("Work element bulunamadı.", "NOT_FOUND");
  }

  await assertRevisionEditable(context, workElement.processVariantRevisionId);

  const nodeRows = await db
    .select({ flowId: flowNode.flowId })
    .from(flowNode)
    .where(and(eq(flowNode.organizationId, context.organizationId), eq(flowNode.id, flowNodeId)))
    .limit(1);

  if (!nodeRows[0]) {
    throw new WorkElementRuleError("Node bulunamadı.", "NOT_FOUND");
  }

  /*
   * Node ve work element aynı teknik revision kapsamında olmalıdır: başka bir
   * revision'ın (örneğin yayınlanmış bir revision'ın) akışına bağlantı
   * yapılamaz.
   */
  const nodeRevisionId = await getNodeRevisionId(context.organizationId, flowNodeId);

  if (!nodeRevisionId) {
    throw new WorkElementRuleError("Node'un revision'ı bulunamadı.", "NOT_FOUND");
  }

  if (nodeRevisionId !== workElement.processVariantRevisionId) {
    throw new WorkElementRuleError(
      "Node ve work element aynı revision'a ait olmalıdır.",
      "INVALID_INPUT",
    );
  }

  const existing = await listNodeWorkElements(context.organizationId, flowNodeId);

  if (existing.some((entry) => entry.id === processWorkElementId)) {
    return;
  }

  await db.transaction(async (tx) => {
    /*
     * Revision satırı kilitlenerek düzenlenebilir durumu transaction
     * içinde yeniden doğrulanır: incelemeye gönderilen bir
     * revision'a içerik yazılamaz.
     */
    const editable = await lockDraftRevision(
      tx,
      context.organizationId,
      workElement.processVariantRevisionId,
    );

    if (!editable) {
      throw new WorkElementRuleError(
        "Revision düzenlenemez; yalnızca taslak revision değiştirilebilir.",
        "INVALID_STATE",
      );
    }
    await tx.insert(flowNodeWorkElement).values({
      organizationId: context.organizationId,
      flowNodeId,
      processWorkElementId,
    });

    await writeAuditLog(
      {
        organizationId: context.organizationId,
        actorId: context.userId,
        action: "processWorkElement.linked",
        target: { type: "flowNode", id: flowNodeId },
        metadata: {
          processWorkElementId,
          processVariantRevisionId: workElement.processVariantRevisionId,
        },
      },
      tx,
    );
  });
}

/** Work Element'in node bağlantısını kaldırır. */
export async function detachWorkElementFromNode(
  context: AuthContext,
  flowNodeId: string,
  processWorkElementId: string,
): Promise<void> {
  await requireWorkElementPermission(context, "update");

  const workElement = await getWorkElement(context.organizationId, processWorkElementId);

  if (!workElement) {
    throw new WorkElementRuleError("Work element bulunamadı.", "NOT_FOUND");
  }

  await assertRevisionEditable(context, workElement.processVariantRevisionId);

  await db.transaction(async (tx) => {
    /*
     * Revision satırı kilitlenerek düzenlenebilir durumu transaction
     * içinde yeniden doğrulanır: incelemeye gönderilen bir
     * revision'a içerik yazılamaz.
     */
    const editable = await lockDraftRevision(
      tx,
      context.organizationId,
      workElement.processVariantRevisionId,
    );

    if (!editable) {
      throw new WorkElementRuleError(
        "Revision düzenlenemez; yalnızca taslak revision değiştirilebilir.",
        "INVALID_STATE",
      );
    }
    await tx
      .delete(flowNodeWorkElement)
      .where(
        and(
          eq(flowNodeWorkElement.organizationId, context.organizationId),
          eq(flowNodeWorkElement.flowNodeId, flowNodeId),
          eq(flowNodeWorkElement.processWorkElementId, processWorkElementId),
        ),
      );

    await writeAuditLog(
      {
        organizationId: context.organizationId,
        actorId: context.userId,
        action: "processWorkElement.unlinked",
        target: { type: "flowNode", id: flowNodeId },
        metadata: { processWorkElementId },
      },
      tx,
    );
  });
}
