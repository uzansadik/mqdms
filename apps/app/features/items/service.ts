import { writeAuditLog } from "@mqdms/audit";
import { type AuthContext, hasPermission } from "@mqdms/auth/permissions/server";
import { db } from "@mqdms/db";
import { item, itemRevision } from "@mqdms/db/schema";
import { and, eq } from "drizzle-orm";

import { getItemGroup } from "@/features/item-groups/repository";
import { getUnit } from "@/features/units/repository";

import { findItemByCode, findItemRevisionByValue, getItem, getItemRevision } from "./repository";
import type { ItemFormValues } from "./schema";

/**
 * İş kuralı ihlali.
 */
export class ItemRuleError extends Error {
  constructor(
    message: string,
    readonly code: "NOT_FOUND" | "CONFLICT" | "INVALID_INPUT" | "FORBIDDEN",
  ) {
    super(message);
    this.name = "ItemRuleError";
  }
}

/**
 * Yetki kontrolü.
 *
 * Servis katmanında yapılır: aksiyon, sayfa veya başka bir çağıran
 * yetkisiz bir yola ulaşsa bile kontrol kaçırılmaz.
 */
async function requireItemPermission(context: AuthContext, action: string): Promise<void> {
  if (!(await hasPermission(context, "items", action))) {
    throw new ItemRuleError("Bu işlem için yetkiniz yok.", "FORBIDDEN");
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
 * Ürün grubu ve birim referanslarını doğrular.
 *
 * Referanslar aynı organizasyona ait olmak zorundadır; birimin varlığı
 * zorunludur, grup ise taslak üründe eksik olabilir.
 */
async function validateReferences(
  context: AuthContext,
  itemGroupId: string | null,
  unitOfMeasureId: string,
): Promise<void> {
  const unit = await getUnit(context.organizationId, unitOfMeasureId);

  if (!unit || unit.archivedAt) {
    throw new ItemRuleError("Birim bulunamadı.", "NOT_FOUND");
  }

  if (!itemGroupId) {
    return;
  }

  const group = await getItemGroup(context.organizationId, itemGroupId);

  if (!group || group.archivedAt) {
    throw new ItemRuleError("Ürün grubu bulunamadı.", "NOT_FOUND");
  }
}

/**
 * Ürün oluşturur.
 *
 * Ürün bir projeye değil organizasyona aittir; aynı ürün birden fazla
 * projede kullanılabilir.
 */
export async function createItem(context: AuthContext, input: ItemFormValues): Promise<string> {
  await requireItemPermission(context, "create");

  const code = input.code.trim();

  return db.transaction(async (tx) => {
    const existing = await findItemByCode(context.organizationId, code);

    if (existing) {
      throw new ItemRuleError("Bu ürün kodu zaten kullanılıyor.", "CONFLICT");
    }

    const itemGroupId = toNull(input.itemGroupId);

    await validateReferences(context, itemGroupId, input.unitOfMeasureId);

    const created = await tx
      .insert(item)
      .values({
        organizationId: context.organizationId,
        code,
        name: input.name.trim(),
        description: toNull(input.description),
        itemGroupId,
        itemType: input.itemType,
        supplyType: input.supplyType === "" ? null : (input.supplyType ?? null),
        unitOfMeasureId: input.unitOfMeasureId,
        status: input.status,
        createdById: context.userId,
      })
      .returning({ id: item.id });

    const itemId = created[0]?.id;

    if (!itemId) {
      throw new ItemRuleError("Ürün oluşturulamadı.", "INVALID_INPUT");
    }

    await writeAuditLog(
      {
        organizationId: context.organizationId,
        actorId: context.userId,
        action: "item.created",
        target: { type: "item", id: itemId },
        metadata: { code, name: input.name.trim(), itemType: input.itemType },
      },
      tx,
    );

    return itemId;
  });
}

/** Ürünü günceller. */
export async function updateItem(
  context: AuthContext,
  itemId: string,
  input: ItemFormValues,
): Promise<void> {
  await requireItemPermission(context, "update");

  const code = input.code.trim();

  await db.transaction(async (tx) => {
    const target = await getItem(context.organizationId, itemId);

    if (!target) {
      throw new ItemRuleError("Ürün bulunamadı.", "NOT_FOUND");
    }

    const existing = await findItemByCode(context.organizationId, code, itemId);

    if (existing) {
      throw new ItemRuleError("Bu ürün kodu zaten kullanılıyor.", "CONFLICT");
    }

    const itemGroupId = toNull(input.itemGroupId);

    await validateReferences(context, itemGroupId, input.unitOfMeasureId);

    await tx
      .update(item)
      .set({
        code,
        name: input.name.trim(),
        description: toNull(input.description),
        itemGroupId,
        itemType: input.itemType,
        supplyType: input.supplyType === "" ? null : (input.supplyType ?? null),
        unitOfMeasureId: input.unitOfMeasureId,
        status: input.status,
      })
      .where(and(eq(item.organizationId, context.organizationId), eq(item.id, itemId)));

    await writeAuditLog(
      {
        organizationId: context.organizationId,
        actorId: context.userId,
        action: "item.updated",
        target: { type: "item", id: itemId },
        metadata: { code, name: input.name.trim() },
      },
      tx,
    );
  });
}

/**
 * Ürünü arşivler.
 *
 * Ürün fiziksel olarak silinmez: ilişkili kayıtlar (BOM satırları, proje
 * item'ları) korunur ve arşiv geri alınabilir.
 */
export async function archiveItem(context: AuthContext, itemId: string): Promise<void> {
  await requireItemPermission(context, "archive");

  await db.transaction(async (tx) => {
    const target = await getItem(context.organizationId, itemId);

    if (!target) {
      throw new ItemRuleError("Ürün bulunamadı.", "NOT_FOUND");
    }

    if (target.archivedAt) {
      return;
    }

    await tx
      .update(item)
      .set({ archivedAt: new Date() })
      .where(and(eq(item.organizationId, context.organizationId), eq(item.id, itemId)));

    await writeAuditLog(
      {
        organizationId: context.organizationId,
        actorId: context.userId,
        action: "item.archived",
        target: { type: "item", id: itemId },
        metadata: { code: target.code },
      },
      tx,
    );
  });
}

/** Ürünü arşivden çıkarır. */
export async function restoreItem(context: AuthContext, itemId: string): Promise<void> {
  await requireItemPermission(context, "restore");

  await db.transaction(async (tx) => {
    const target = await getItem(context.organizationId, itemId);

    if (!target) {
      throw new ItemRuleError("Ürün bulunamadı.", "NOT_FOUND");
    }

    if (!target.archivedAt) {
      return;
    }

    await tx
      .update(item)
      .set({ archivedAt: null })
      .where(and(eq(item.organizationId, context.organizationId), eq(item.id, itemId)));

    await writeAuditLog(
      {
        organizationId: context.organizationId,
        actorId: context.userId,
        action: "item.restored",
        target: { type: "item", id: itemId },
        metadata: { code: target.code },
      },
      tx,
    );
  });
}

/* -------------------------------------------------------------------------
 * Item revision
 * ---------------------------------------------------------------------- */

/** Item revision hatası. */
export class ItemRevisionRuleError extends Error {
  constructor(
    message: string,
    readonly code: "NOT_FOUND" | "CONFLICT" | "INVALID_INPUT" | "FORBIDDEN",
  ) {
    super(message);
    this.name = "ItemRevisionRuleError";
  }
}

/**
 * Item revision oluşturur.
 *
 * Bir item kartı revision bilgisi olmadan açılabilir; ancak yayınlanmış teknik
 * yapılarda kullanılan ürünün revizyonu açıkça belirlenmelidir.
 *
 * Revision değeri **metin** olarak saklanır: sayısal artış zorunlu değildir.
 */
export async function createItemRevision(
  context: AuthContext,
  input: {
    itemId: string;
    revision: string;
    description?: string | null;
    changeReason?: string | null;
    effectiveFrom?: string | null;
  },
): Promise<string> {
  await requireItemPermission(context, "manageRevisions");

  const revision = input.revision.trim();

  return db.transaction(async (tx) => {
    const target = await getItem(context.organizationId, input.itemId);

    if (!target || target.archivedAt) {
      throw new ItemRevisionRuleError("Ürün bulunamadı.", "NOT_FOUND");
    }

    const existing = await findItemRevisionByValue(context.organizationId, input.itemId, revision);

    if (existing) {
      throw new ItemRevisionRuleError(
        "Bu revision değeri bu ürün için zaten kullanılıyor.",
        "CONFLICT",
      );
    }

    const created = await tx
      .insert(itemRevision)
      .values({
        organizationId: context.organizationId,
        itemId: input.itemId,
        revision,
        description: input.description ?? null,
        changeReason: input.changeReason ?? null,
        effectiveFrom: input.effectiveFrom ?? null,
        status: "DRAFT",
        createdById: context.userId,
      })
      .returning({ id: itemRevision.id });

    const revisionId = created[0]?.id;

    if (!revisionId) {
      throw new ItemRevisionRuleError("Revision oluşturulamadı.", "INVALID_INPUT");
    }

    await writeAuditLog(
      {
        organizationId: context.organizationId,
        actorId: context.userId,
        action: "itemRevision.created",
        target: { type: "itemRevision", id: revisionId },
        metadata: { itemId: input.itemId, revision },
      },
      tx,
    );

    return revisionId;
  });
}

/**
 * Item revision'ını yayınlar.
 *
 * Yayınlanan revision teknik içerik olarak **değiştirilemez**; yeni bir teknik
 * değişiklik için yeni revision oluşturulur. Önceki revision silinmez.
 */
export async function releaseItemRevision(context: AuthContext, revisionId: string): Promise<void> {
  await requireItemPermission(context, "releaseRevision");

  await db.transaction(async (tx) => {
    const target = await getItemRevision(context.organizationId, revisionId);

    if (!target) {
      throw new ItemRevisionRuleError("Revision bulunamadı.", "NOT_FOUND");
    }

    if (target.status === "RELEASED") {
      return;
    }

    await tx
      .update(itemRevision)
      .set({ status: "RELEASED", releasedAt: new Date(), releasedById: context.userId })
      .where(
        and(
          eq(itemRevision.organizationId, context.organizationId),
          eq(itemRevision.id, revisionId),
        ),
      );

    await writeAuditLog(
      {
        organizationId: context.organizationId,
        actorId: context.userId,
        action: "itemRevision.released",
        target: { type: "itemRevision", id: revisionId },
        metadata: { itemId: target.itemId, revision: target.revision },
      },
      tx,
    );
  });
}
