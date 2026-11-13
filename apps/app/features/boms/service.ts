import { writeAuditLog } from "@mqdms/audit";
import { type AuthContext, hasPermission } from "@mqdms/auth/permissions/server";
import { db } from "@mqdms/db";
import { bom, bomLine, bomRevision } from "@mqdms/db/schema";
import { and, eq } from "drizzle-orm";

import { getItem, getItemRevision } from "@/features/items/repository";

import {
  findBomByCode,
  findBomRevisionByValue,
  getBom,
  getBomLine,
  getBomRevision,
  listContainedItemIds,
} from "./repository";
import type { BomFormValues, BomLineFormValues, BomRevisionFormValues } from "./schema";

/**
 * İş kuralı ihlali.
 */
export class BomRuleError extends Error {
  constructor(
    message: string,
    readonly code: "NOT_FOUND" | "CONFLICT" | "INVALID_INPUT" | "FORBIDDEN",
  ) {
    super(message);
    this.name = "BomRuleError";
  }
}

/** Yetki kontrolü. */
async function requireBomPermission(context: AuthContext, action: string): Promise<void> {
  if (!(await hasPermission(context, "boms", action))) {
    throw new BomRuleError("Bu işlem için yetkiniz yok.", "FORBIDDEN");
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
 * Bir BOM satırının döngü oluşturup oluşturmadığını denetler.
 *
 * Bir ürün kendisini doğrudan veya dolaylı olarak bileşen olarak
 * kullanamaz: BOM ağacı sonsuza kadar açılır.
 */
async function wouldCreateCycle(
  organizationId: string,
  parentItemId: string,
  childItemId: string,
): Promise<boolean> {
  if (parentItemId === childItemId) {
    return true;
  }

  const visited = new Set<string>();
  const stack = [childItemId];

  while (stack.length > 0) {
    const current = stack.pop();

    if (!current || visited.has(current)) {
      continue;
    }

    visited.add(current);

    if (current === parentItemId) {
      return true;
    }

    const contained = await listContainedItemIds(organizationId, current);

    for (const containedId of contained) {
      stack.push(containedId);
    }
  }

  return false;
}

/**
 * Yayınlanmış bir revision'ın içeriği doğrudan değiştirilemez.
 *
 * Yeni değişiklik `DRAFT` bir revision üzerinde yapılır.
 */
async function assertRevisionIsEditable(
  organizationId: string,
  bomRevisionId: string,
): Promise<void> {
  const revision = await getBomRevision(organizationId, bomRevisionId);

  if (!revision) {
    throw new BomRuleError("BOM revision'ı bulunamadı.", "NOT_FOUND");
  }

  if (revision.status === "RELEASED") {
    throw new BomRuleError(
      "Yayınlanmış bir BOM revision'ı doğrudan değiştirilemez. Yeni bir taslak revision oluşturun.",
      "INVALID_INPUT",
    );
  }
}

/* -------------------------------------------------------------------------
 * BOM
 * ---------------------------------------------------------------------- */

/** BOM oluşturur. */
export async function createBom(context: AuthContext, input: BomFormValues): Promise<string> {
  await requireBomPermission(context, "create");

  const code = input.code.trim().toUpperCase();

  return db.transaction(async (tx) => {
    const existing = await findBomByCode(context.organizationId, code);

    if (existing) {
      throw new BomRuleError("Bu BOM kodu zaten kullanılıyor.", "CONFLICT");
    }

    const itemRecord = await getItem(context.organizationId, input.itemId);

    if (!itemRecord || itemRecord.archivedAt) {
      throw new BomRuleError("Ürün bulunamadı.", "NOT_FOUND");
    }

    const created = await tx
      .insert(bom)
      .values({
        organizationId: context.organizationId,
        itemId: input.itemId,
        code,
        name: input.name.trim(),
        description: toNull(input.description),
        bomType: input.bomType,
        status: input.status,
        createdById: context.userId,
      })
      .returning({ id: bom.id });

    const bomId = created[0]?.id;

    if (!bomId) {
      throw new BomRuleError("BOM oluşturulamadı.", "INVALID_INPUT");
    }

    await writeAuditLog(
      {
        organizationId: context.organizationId,
        actorId: context.userId,
        action: "bom.created",
        target: { type: "bom", id: bomId },
        metadata: { code, itemId: input.itemId },
      },
      tx,
    );

    return bomId;
  });
}

/** BOM'u günceller. */
export async function updateBom(
  context: AuthContext,
  bomId: string,
  input: BomFormValues,
): Promise<void> {
  await requireBomPermission(context, "update");

  const code = input.code.trim().toUpperCase();

  await db.transaction(async (tx) => {
    const target = await getBom(context.organizationId, bomId);

    if (!target) {
      throw new BomRuleError("BOM bulunamadı.", "NOT_FOUND");
    }

    const existing = await findBomByCode(context.organizationId, code, bomId);

    if (existing) {
      throw new BomRuleError("Bu BOM kodu zaten kullanılıyor.", "CONFLICT");
    }

    await tx
      .update(bom)
      .set({
        code,
        name: input.name.trim(),
        description: toNull(input.description),
        bomType: input.bomType,
        status: input.status,
      })
      .where(and(eq(bom.organizationId, context.organizationId), eq(bom.id, bomId)));

    await writeAuditLog(
      {
        organizationId: context.organizationId,
        actorId: context.userId,
        action: "bom.updated",
        target: { type: "bom", id: bomId },
        metadata: { code },
      },
      tx,
    );
  });
}

/**
 * BOM'u arşivler.
 *
 * Bir item'ın birden fazla BOM tanımı olabilir; hangisinin kullanılacağı
 * kullanım yerinde açıkça seçilir.
 */
export async function archiveBom(context: AuthContext, bomId: string): Promise<void> {
  await requireBomPermission(context, "archive");

  await db.transaction(async (tx) => {
    const target = await getBom(context.organizationId, bomId);

    if (!target) {
      throw new BomRuleError("BOM bulunamadı.", "NOT_FOUND");
    }

    if (target.archivedAt) {
      return;
    }

    await tx
      .update(bom)
      .set({ archivedAt: new Date() })
      .where(and(eq(bom.organizationId, context.organizationId), eq(bom.id, bomId)));

    await writeAuditLog(
      {
        organizationId: context.organizationId,
        actorId: context.userId,
        action: "bom.archived",
        target: { type: "bom", id: bomId },
        metadata: { code: target.code },
      },
      tx,
    );
  });
}

/* -------------------------------------------------------------------------
 * BOM revision
 * ---------------------------------------------------------------------- */

/** BOM revision'ı oluşturur. */
export async function createBomRevision(
  context: AuthContext,
  input: BomRevisionFormValues,
): Promise<string> {
  await requireBomPermission(context, "update");

  const revision = input.revision.trim();

  return db.transaction(async (tx) => {
    const target = await getBom(context.organizationId, input.bomId);

    if (!target) {
      throw new BomRuleError("BOM bulunamadı.", "NOT_FOUND");
    }

    const existing = await findBomRevisionByValue(context.organizationId, input.bomId, revision);

    if (existing) {
      throw new BomRuleError("Bu revision değeri bu BOM altında zaten kullanılıyor.", "CONFLICT");
    }

    const parentItemRevisionId = toNull(input.parentItemRevisionId);

    if (parentItemRevisionId) {
      const parentRevision = await getItemRevision(context.organizationId, parentItemRevisionId);

      if (!parentRevision || parentRevision.itemId !== target.itemId) {
        throw new BomRuleError("Seçilen revision bu BOM'un ürününe ait değil.", "INVALID_INPUT");
      }
    }

    const created = await tx
      .insert(bomRevision)
      .values({
        organizationId: context.organizationId,
        bomId: input.bomId,
        revision,
        description: toNull(input.description),
        changeReason: toNull(input.changeReason),
        status: input.status,
        effectiveFrom: toNull(input.effectiveFrom),
        sourceSystem: toNull(input.sourceSystem),
        sourceRevision: toNull(input.sourceRevision),
        parentItemRevisionId,
        createdById: context.userId,
      })
      .returning({ id: bomRevision.id });

    const revisionId = created[0]?.id;

    if (!revisionId) {
      throw new BomRuleError("BOM revision'ı oluşturulamadı.", "INVALID_INPUT");
    }

    await writeAuditLog(
      {
        organizationId: context.organizationId,
        actorId: context.userId,
        action: "bomRevision.created",
        target: { type: "bomRevision", id: revisionId },
        metadata: { bomId: input.bomId, revision },
      },
      tx,
    );

    return revisionId;
  });
}

/**
 * BOM revision'ını günceller.
 *
 * Yayınlanmış revision'ın içeriği doğrudan değiştirilemez.
 */
export async function updateBomRevision(
  context: AuthContext,
  revisionId: string,
  input: BomRevisionFormValues,
): Promise<void> {
  await requireBomPermission(context, "update");

  const revision = input.revision.trim();

  await db.transaction(async (tx) => {
    const target = await getBomRevision(context.organizationId, revisionId);

    if (!target) {
      throw new BomRuleError("BOM revision'ı bulunamadı.", "NOT_FOUND");
    }

    if (target.status === "RELEASED") {
      throw new BomRuleError(
        "Yayınlanmış bir BOM revision'ı doğrudan değiştirilemez. Yeni bir taslak revision oluşturun.",
        "INVALID_INPUT",
      );
    }

    const existing = await findBomRevisionByValue(
      context.organizationId,
      input.bomId,
      revision,
      revisionId,
    );

    if (existing) {
      throw new BomRuleError("Bu revision değeri bu BOM altında zaten kullanılıyor.", "CONFLICT");
    }

    await tx
      .update(bomRevision)
      .set({
        revision,
        description: toNull(input.description),
        changeReason: toNull(input.changeReason),
        status: input.status,
        effectiveFrom: toNull(input.effectiveFrom),
        sourceSystem: toNull(input.sourceSystem),
        sourceRevision: toNull(input.sourceRevision),
        parentItemRevisionId: toNull(input.parentItemRevisionId),
      })
      .where(
        and(eq(bomRevision.organizationId, context.organizationId), eq(bomRevision.id, revisionId)),
      );

    await writeAuditLog(
      {
        organizationId: context.organizationId,
        actorId: context.userId,
        action: "bomRevision.updated",
        target: { type: "bomRevision", id: revisionId },
        metadata: { revision },
      },
      tx,
    );
  });
}

/**
 * BOM revision'ını yayınlar.
 *
 * Yayınlanan revision'ın içeriği değiştirilemez; sonraki değişiklikler yeni
 * bir taslak revision üzerinde yapılır.
 */
export async function releaseBomRevision(context: AuthContext, revisionId: string): Promise<void> {
  await requireBomPermission(context, "release");

  await db.transaction(async (tx) => {
    const target = await getBomRevision(context.organizationId, revisionId);

    if (!target) {
      throw new BomRuleError("BOM revision'ı bulunamadı.", "NOT_FOUND");
    }

    if (target.status === "RELEASED") {
      return;
    }

    await tx
      .update(bomRevision)
      .set({ status: "RELEASED", releasedAt: new Date(), releasedById: context.userId })
      .where(
        and(eq(bomRevision.organizationId, context.organizationId), eq(bomRevision.id, revisionId)),
      );

    await writeAuditLog(
      {
        organizationId: context.organizationId,
        actorId: context.userId,
        action: "bomRevision.released",
        target: { type: "bomRevision", id: revisionId },
        metadata: { revision: target.revision },
      },
      tx,
    );
  });
}

/* -------------------------------------------------------------------------
 * BOM satırları
 * ---------------------------------------------------------------------- */

/**
 * BOM satırı ekler.
 *
 * Satır, revision'ın sahibi olan ürün ile bileşen ürün arasındaki ilişkiyi
 * tanımlar. Döngüsel ilişkiler ve yayınlanmış revision üzerinde değişiklik
 * reddedilir.
 */
export async function addBomLine(context: AuthContext, input: BomLineFormValues): Promise<string> {
  await requireBomPermission(context, "update");

  const childItemRevisionId = toNull(input.childItemRevisionId);
  const childBomRevisionId = toNull(input.childBomRevisionId);
  const unitOfMeasureId = toNull(input.unitOfMeasureId);

  return db.transaction(async (tx) => {
    const revision = await getBomRevision(context.organizationId, input.bomRevisionId);

    if (!revision) {
      throw new BomRuleError("BOM revision'ı bulunamadı.", "NOT_FOUND");
    }

    await assertRevisionIsEditable(context.organizationId, input.bomRevisionId);

    const parentBom = await getBom(context.organizationId, revision.bomId);

    if (!parentBom) {
      throw new BomRuleError("BOM bulunamadı.", "NOT_FOUND");
    }

    const childItem = await getItem(context.organizationId, input.childItemId);

    if (!childItem || childItem.archivedAt) {
      throw new BomRuleError("Bileşen ürünü bulunamadı.", "NOT_FOUND");
    }

    if (childItemRevisionId) {
      const childRevision = await getItemRevision(context.organizationId, childItemRevisionId);

      if (!childRevision || childRevision.itemId !== input.childItemId) {
        throw new BomRuleError("Seçilen revision bu bileşen ürününe ait değil.", "INVALID_INPUT");
      }
    }

    if (childBomRevisionId) {
      const childRevision = await getBomRevision(context.organizationId, childBomRevisionId);

      if (!childRevision) {
        throw new BomRuleError("Alt BOM revision'ı bulunamadı.", "NOT_FOUND");
      }

      const childBom = await getBom(context.organizationId, childRevision.bomId);

      if (!childBom || childBom.itemId !== input.childItemId) {
        throw new BomRuleError(
          "Seçilen alt BOM revision'ı bu bileşen ürününe ait değil.",
          "INVALID_INPUT",
        );
      }
    }

    if (await wouldCreateCycle(context.organizationId, parentBom.itemId, input.childItemId)) {
      throw new BomRuleError(
        "Bu bileşen eklendiğinde döngüsel bir BOM ilişkisi oluşur.",
        "INVALID_INPUT",
      );
    }

    const created = await tx
      .insert(bomLine)
      .values({
        organizationId: context.organizationId,
        bomRevisionId: input.bomRevisionId,
        childItemId: input.childItemId,
        childItemRevisionId,
        childBomRevisionId,
        lineNumber: input.lineNumber,
        quantity: input.quantity,
        unitOfMeasureId,
        description: toNull(input.description),
        referenceDesignation: toNull(input.referenceDesignation),
        joiningMethod: input.joiningMethod ?? null,
        notes: toNull(input.notes),
        positionReference: toNull(input.positionReference),
      })
      .returning({ id: bomLine.id });

    const lineId = created[0]?.id;

    if (!lineId) {
      throw new BomRuleError("BOM satırı eklenemedi.", "INVALID_INPUT");
    }

    await writeAuditLog(
      {
        organizationId: context.organizationId,
        actorId: context.userId,
        action: "bomLine.added",
        target: { type: "bomLine", id: lineId },
        metadata: {
          bomRevisionId: input.bomRevisionId,
          childItemId: input.childItemId,
          quantity: input.quantity,
        },
      },
      tx,
    );

    return lineId;
  });
}

/** BOM satırını günceller. */
export async function updateBomLine(
  context: AuthContext,
  lineId: string,
  input: BomLineFormValues,
): Promise<void> {
  await requireBomPermission(context, "update");

  await db.transaction(async (tx) => {
    const target = await getBomLine(context.organizationId, lineId);

    if (!target) {
      throw new BomRuleError("BOM satırı bulunamadı.", "NOT_FOUND");
    }

    await assertRevisionIsEditable(context.organizationId, target.bomRevisionId);

    const childItemRevisionId = toNull(input.childItemRevisionId);
    const childBomRevisionId = toNull(input.childBomRevisionId);

    if (childItemRevisionId) {
      const childRevision = await getItemRevision(context.organizationId, childItemRevisionId);

      if (!childRevision || childRevision.itemId !== input.childItemId) {
        throw new BomRuleError("Seçilen revision bu bileşen ürününe ait değil.", "INVALID_INPUT");
      }
    }

    if (childBomRevisionId) {
      const childRevision = await getBomRevision(context.organizationId, childBomRevisionId);

      if (!childRevision) {
        throw new BomRuleError("Alt BOM revision'ı bulunamadı.", "NOT_FOUND");
      }

      const childBom = await getBom(context.organizationId, childRevision.bomId);

      if (!childBom || childBom.itemId !== input.childItemId) {
        throw new BomRuleError(
          "Seçilen alt BOM revision'ı bu bileşen ürününe ait değil.",
          "INVALID_INPUT",
        );
      }
    }

    await tx
      .update(bomLine)
      .set({
        childItemId: input.childItemId,
        childItemRevisionId,
        childBomRevisionId,
        lineNumber: input.lineNumber,
        quantity: input.quantity,
        unitOfMeasureId: toNull(input.unitOfMeasureId),
        description: toNull(input.description),
        referenceDesignation: toNull(input.referenceDesignation),
        joiningMethod: input.joiningMethod ?? null,
        notes: toNull(input.notes),
        positionReference: toNull(input.positionReference),
      })
      .where(and(eq(bomLine.organizationId, context.organizationId), eq(bomLine.id, lineId)));

    await writeAuditLog(
      {
        organizationId: context.organizationId,
        actorId: context.userId,
        action: "bomLine.updated",
        target: { type: "bomLine", id: lineId },
        metadata: { childItemId: input.childItemId, quantity: input.quantity },
      },
      tx,
    );
  });
}

/** BOM satırını kaldırır. */
export async function removeBomLine(context: AuthContext, lineId: string): Promise<void> {
  await requireBomPermission(context, "update");

  await db.transaction(async (tx) => {
    const target = await getBomLine(context.organizationId, lineId);

    if (!target) {
      throw new BomRuleError("BOM satırı bulunamadı.", "NOT_FOUND");
    }

    await assertRevisionIsEditable(context.organizationId, target.bomRevisionId);

    await tx
      .delete(bomLine)
      .where(and(eq(bomLine.organizationId, context.organizationId), eq(bomLine.id, lineId)));

    await writeAuditLog(
      {
        organizationId: context.organizationId,
        actorId: context.userId,
        action: "bomLine.removed",
        target: { type: "bomLine", id: lineId },
        metadata: { childItemId: target.childItemId },
      },
      tx,
    );
  });
}
