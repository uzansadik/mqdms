import { writeAuditLog } from "@mqdms/audit";
import { type AuthContext, hasPermission } from "@mqdms/auth/permissions/server";
import { db } from "@mqdms/db";
import { item, itemGroup } from "@mqdms/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import type { ItemGroupFormValues } from "@/features/items/schema";
import {
  findItemGroupByCode,
  getItemGroup,
  listAncestorGroupIds,
  listDescendantGroupIds,
} from "./repository";

/**
 * İş kuralı ihlali.
 */
export class ItemGroupRuleError extends Error {
  constructor(
    message: string,
    readonly code: "NOT_FOUND" | "CONFLICT" | "INVALID_INPUT" | "FORBIDDEN",
  ) {
    super(message);
    this.name = "ItemGroupRuleError";
  }
}

/**
 * Yetki kontrolü.
 *
 * Servis katmanında yapılır: aksiyon, sayfa veya başka bir çağıran
 * yetkisiz bir yola ulaşsa bile kontrol kaçırılmaz.
 */
async function requireItemGroupPermission(context: AuthContext, action: string): Promise<void> {
  if (!(await hasPermission(context, "itemGroups", action))) {
    throw new ItemGroupRuleError("Bu işlem için yetkiniz yok.", "FORBIDDEN");
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
 * Üst grubun geçerli olduğunu doğrular.
 *
 * Döngüsel hiyerarşi engeller: bir grubun parent'ı kendisi veya kendi alt
 * grubu olamaz.
 */
async function validateParent(
  context: AuthContext,
  groupId: string | undefined,
  parentId: string | null,
): Promise<void> {
  if (!parentId) {
    return;
  }

  if (groupId && groupId === parentId) {
    throw new ItemGroupRuleError("Bir grup kendi alt grubunun parent'ı olamaz.", "INVALID_INPUT");
  }

  const parent = await getItemGroup(context.organizationId, parentId);

  if (!parent || parent.archivedAt) {
    throw new ItemGroupRuleError("Üst grup bulunamadı.", "NOT_FOUND");
  }

  if (!groupId) {
    return;
  }

  const ancestors = await listAncestorGroupIds(context.organizationId, parentId);

  if (ancestors.includes(groupId)) {
    throw new ItemGroupRuleError(
      "Bu atama döngüsel bir grup hiyerarşisi oluşturur.",
      "INVALID_INPUT",
    );
  }
}

/** Ürün grubu oluşturur. */
export async function createItemGroup(
  context: AuthContext,
  input: ItemGroupFormValues,
): Promise<string> {
  await requireItemGroupPermission(context, "create");

  const code = input.code.trim();

  return db.transaction(async (tx) => {
    const existing = await findItemGroupByCode(context.organizationId, code);

    if (existing) {
      throw new ItemGroupRuleError("Bu grup kodu zaten kullanılıyor.", "CONFLICT");
    }

    const parentId = toNull(input.parentId);

    await validateParent(context, undefined, parentId);

    const created = await tx
      .insert(itemGroup)
      .values({
        organizationId: context.organizationId,
        code,
        name: input.name.trim(),
        description: toNull(input.description),
        parentId,
        sortOrder: input.sortOrder,
        status: input.status,
        createdById: context.userId,
      })
      .returning({ id: itemGroup.id });

    const groupId = created[0]?.id;

    if (!groupId) {
      throw new ItemGroupRuleError("Grup oluşturulamadı.", "INVALID_INPUT");
    }

    await writeAuditLog(
      {
        organizationId: context.organizationId,
        actorId: context.userId,
        action: "itemGroup.created",
        target: { type: "itemGroup", id: groupId },
        metadata: { code, name: input.name.trim() },
      },
      tx,
    );

    return groupId;
  });
}

/** Ürün grubunu günceller. */
export async function updateItemGroup(
  context: AuthContext,
  groupId: string,
  input: ItemGroupFormValues,
): Promise<void> {
  await requireItemGroupPermission(context, "update");

  const code = input.code.trim();

  await db.transaction(async (tx) => {
    const target = await getItemGroup(context.organizationId, groupId);

    if (!target) {
      throw new ItemGroupRuleError("Grup bulunamadı.", "NOT_FOUND");
    }

    const existing = await findItemGroupByCode(context.organizationId, code, groupId);

    if (existing) {
      throw new ItemGroupRuleError("Bu grup kodu zaten kullanılıyor.", "CONFLICT");
    }

    const parentId = toNull(input.parentId);

    await validateParent(context, groupId, parentId);

    await tx
      .update(itemGroup)
      .set({
        code,
        name: input.name.trim(),
        description: toNull(input.description),
        parentId,
        sortOrder: input.sortOrder,
        status: input.status,
      })
      .where(and(eq(itemGroup.organizationId, context.organizationId), eq(itemGroup.id, groupId)));

    await writeAuditLog(
      {
        organizationId: context.organizationId,
        actorId: context.userId,
        action: "itemGroup.updated",
        target: { type: "itemGroup", id: groupId },
        metadata: { code, name: input.name.trim() },
      },
      tx,
    );
  });
}

/**
 * Ürün grubunu arşivler.
 *
 * Alt grupları veya aktif item'ları bulunan grup arşivlenemez: grup
 * arşivlenince altındaki item'lar sınıflandırmasız kalır.
 */
export async function archiveItemGroup(context: AuthContext, groupId: string): Promise<void> {
  await requireItemGroupPermission(context, "archive");

  await db.transaction(async (tx) => {
    const target = await getItemGroup(context.organizationId, groupId);

    if (!target) {
      throw new ItemGroupRuleError("Grup bulunamadı.", "NOT_FOUND");
    }

    if (target.archivedAt) {
      return;
    }

    const childGroups = await listDescendantGroupIds(context.organizationId, groupId);

    if (childGroups.length > 0) {
      throw new ItemGroupRuleError(
        "Grubun alt grupları var. Önce alt grupları taşıyın veya arşivleyin.",
        "CONFLICT",
      );
    }

    const usedItems = await tx
      .select({ id: item.id })
      .from(item)
      .where(
        and(
          eq(item.organizationId, context.organizationId),
          eq(item.itemGroupId, groupId),
          isNull(item.archivedAt),
        ),
      )
      .limit(1);

    if (usedItems.length > 0) {
      throw new ItemGroupRuleError(
        "Gruba atanmış item'lar var. Önce item'ları taşıyın veya arşivleyin.",
        "CONFLICT",
      );
    }

    await tx
      .update(itemGroup)
      .set({ archivedAt: new Date() })
      .where(and(eq(itemGroup.organizationId, context.organizationId), eq(itemGroup.id, groupId)));

    await writeAuditLog(
      {
        organizationId: context.organizationId,
        actorId: context.userId,
        action: "itemGroup.archived",
        target: { type: "itemGroup", id: groupId },
        metadata: { code: target.code },
      },
      tx,
    );
  });
}

/** Ürün grubunu arşivden çıkarır. */
export async function restoreItemGroup(context: AuthContext, groupId: string): Promise<void> {
  await requireItemGroupPermission(context, "restore");

  await db.transaction(async (tx) => {
    const target = await getItemGroup(context.organizationId, groupId);

    if (!target) {
      throw new ItemGroupRuleError("Grup bulunamadı.", "NOT_FOUND");
    }

    if (!target.archivedAt) {
      return;
    }

    await tx
      .update(itemGroup)
      .set({ archivedAt: null })
      .where(and(eq(itemGroup.organizationId, context.organizationId), eq(itemGroup.id, groupId)));

    await writeAuditLog(
      {
        organizationId: context.organizationId,
        actorId: context.userId,
        action: "itemGroup.restored",
        target: { type: "itemGroup", id: groupId },
        metadata: { code: target.code },
      },
      tx,
    );
  });
}
