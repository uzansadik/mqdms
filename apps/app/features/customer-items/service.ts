import { writeAuditLog } from "@mqdms/audit";
import { type AuthContext, hasPermission } from "@mqdms/auth/permissions/server";
import { db } from "@mqdms/db";
import { customerItem, customerItemRevision } from "@mqdms/db/schema";
import { and, eq } from "drizzle-orm";

import { getCustomer } from "@/features/customers/repository";
import { getItem, getItemRevision } from "@/features/items/repository";

import {
  findCustomerItemByPartNumber,
  findCustomerItemRevisionByValue,
  getCustomerItem,
  getCustomerItemRevision,
} from "./repository";
import type { CustomerItemFormValues, CustomerItemRevisionFormValues } from "./schema";

/**
 * İş kuralı ihlali.
 */
export class CustomerItemRuleError extends Error {
  constructor(
    message: string,
    readonly code: "NOT_FOUND" | "CONFLICT" | "INVALID_INPUT" | "FORBIDDEN",
  ) {
    super(message);
    this.name = "CustomerItemRuleError";
  }
}

/**
 * Yetki kontrolü.
 *
 * Müşteri ürün referansları `items:update` kapsamında yönetilir: şirket içi
 * ürün kartının müşteri tarafındaki karşılığı, ürün kartının bir parçasıdır.
 */
async function requireCustomerItemPermission(context: AuthContext, action: string): Promise<void> {
  if (!(await hasPermission(context, "items", action))) {
    throw new CustomerItemRuleError("Bu işlem için yetkiniz yok.", "FORBIDDEN");
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
 * Müşteri ürün referansı oluşturur.
 *
 * Müşteri parça numarası müşteri (ve kapsam) içinde unique'tir; aynı parça
 * numarası farklı müşterilerde kullanılabilir.
 */
export async function createCustomerItem(
  context: AuthContext,
  input: CustomerItemFormValues,
): Promise<string> {
  await requireCustomerItemPermission(context, "update");

  const customerPartNumber = input.customerPartNumber.trim();
  const scope = (input.scope ?? "").trim();

  return db.transaction(async (tx) => {
    const customerRecord = await getCustomer(context.organizationId, input.customerId);

    if (!customerRecord || customerRecord.archivedAt) {
      throw new CustomerItemRuleError("Müşteri bulunamadı.", "NOT_FOUND");
    }

    const itemRecord = await getItem(context.organizationId, input.itemId);

    if (!itemRecord || itemRecord.archivedAt) {
      throw new CustomerItemRuleError("Ürün bulunamadı.", "NOT_FOUND");
    }

    const existing = await findCustomerItemByPartNumber(
      context.organizationId,
      input.customerId,
      customerPartNumber,
      scope,
    );

    if (existing) {
      throw new CustomerItemRuleError(
        "Bu müşteri parça numarası bu müşteri için zaten kullanılıyor.",
        "CONFLICT",
      );
    }

    const created = await tx
      .insert(customerItem)
      .values({
        organizationId: context.organizationId,
        customerId: input.customerId,
        itemId: input.itemId,
        customerPartNumber,
        customerPartName: toNull(input.customerPartName),
        description: toNull(input.description),
        scope,
        status: input.status,
      })
      .returning({ id: customerItem.id });

    const customerItemId = created[0]?.id;

    if (!customerItemId) {
      throw new CustomerItemRuleError("Müşteri ürünü oluşturulamadı.", "INVALID_INPUT");
    }

    await writeAuditLog(
      {
        organizationId: context.organizationId,
        actorId: context.userId,
        action: "customerItem.created",
        target: { type: "customerItem", id: customerItemId },
        metadata: {
          customerId: input.customerId,
          itemId: input.itemId,
          customerPartNumber,
        },
      },
      tx,
    );

    return customerItemId;
  });
}

/** Müşteri ürün referansını günceller. */
export async function updateCustomerItem(
  context: AuthContext,
  customerItemId: string,
  input: CustomerItemFormValues,
): Promise<void> {
  await requireCustomerItemPermission(context, "update");

  const customerPartNumber = input.customerPartNumber.trim();
  const scope = (input.scope ?? "").trim();

  await db.transaction(async (tx) => {
    const target = await getCustomerItem(context.organizationId, customerItemId);

    if (!target) {
      throw new CustomerItemRuleError("Müşteri ürünü bulunamadı.", "NOT_FOUND");
    }

    const existing = await findCustomerItemByPartNumber(
      context.organizationId,
      input.customerId,
      customerPartNumber,
      scope,
      customerItemId,
    );

    if (existing) {
      throw new CustomerItemRuleError(
        "Bu müşteri parça numarası bu müşteri için zaten kullanılıyor.",
        "CONFLICT",
      );
    }

    await tx
      .update(customerItem)
      .set({
        customerId: input.customerId,
        itemId: input.itemId,
        customerPartNumber,
        customerPartName: toNull(input.customerPartName),
        description: toNull(input.description),
        scope,
        status: input.status,
      })
      .where(
        and(
          eq(customerItem.organizationId, context.organizationId),
          eq(customerItem.id, customerItemId),
        ),
      );

    await writeAuditLog(
      {
        organizationId: context.organizationId,
        actorId: context.userId,
        action: "customerItem.updated",
        target: { type: "customerItem", id: customerItemId },
        metadata: { customerPartNumber },
      },
      tx,
    );
  });
}

/**
 * Müşteri ürün referansını arşivler.
 *
 * Referans fiziksel olarak silinmez; müşteri parça numarası geçmişi korunur.
 */
export async function archiveCustomerItem(
  context: AuthContext,
  customerItemId: string,
): Promise<void> {
  await requireCustomerItemPermission(context, "archive");

  await db.transaction(async (tx) => {
    const target = await getCustomerItem(context.organizationId, customerItemId);

    if (!target) {
      throw new CustomerItemRuleError("Müşteri ürünü bulunamadı.", "NOT_FOUND");
    }

    if (target.archivedAt) {
      return;
    }

    await tx
      .update(customerItem)
      .set({ archivedAt: new Date() })
      .where(
        and(
          eq(customerItem.organizationId, context.organizationId),
          eq(customerItem.id, customerItemId),
        ),
      );

    await writeAuditLog(
      {
        organizationId: context.organizationId,
        actorId: context.userId,
        action: "customerItem.archived",
        target: { type: "customerItem", id: customerItemId },
        metadata: { customerPartNumber: target.customerPartNumber },
      },
      tx,
    );
  });
}

/** Müşteri ürün referansını arşivden çıkarır. */
export async function restoreCustomerItem(
  context: AuthContext,
  customerItemId: string,
): Promise<void> {
  await requireCustomerItemPermission(context, "restore");

  await db.transaction(async (tx) => {
    const target = await getCustomerItem(context.organizationId, customerItemId);

    if (!target) {
      throw new CustomerItemRuleError("Müşteri ürünü bulunamadı.", "NOT_FOUND");
    }

    if (!target.archivedAt) {
      return;
    }

    await tx
      .update(customerItem)
      .set({ archivedAt: null })
      .where(
        and(
          eq(customerItem.organizationId, context.organizationId),
          eq(customerItem.id, customerItemId),
        ),
      );

    await writeAuditLog(
      {
        organizationId: context.organizationId,
        actorId: context.userId,
        action: "customerItem.restored",
        target: { type: "customerItem", id: customerItemId },
        metadata: { customerPartNumber: target.customerPartNumber },
      },
      tx,
    );
  });
}

/**
 * Müşteri revision eşleştirmesi oluşturur.
 *
 * Müşteri revision'ı, müşteri ürün revizyonu ve iç ürün revizyonu gerektiğinde
 * ayrı saklanır; zorunlu bir birebir eşitlik yoktur.
 */
export async function createCustomerItemRevision(
  context: AuthContext,
  input: CustomerItemRevisionFormValues,
): Promise<string> {
  await requireCustomerItemPermission(context, "update");

  const customerRevision = input.customerRevision.trim();

  return db.transaction(async (tx) => {
    const customerItemRecord = await getCustomerItem(context.organizationId, input.customerItemId);

    if (!customerItemRecord || customerItemRecord.archivedAt) {
      throw new CustomerItemRuleError("Müşteri ürünü bulunamadı.", "NOT_FOUND");
    }

    const internalItemRevisionId = toNull(input.internalItemRevisionId);

    if (internalItemRevisionId) {
      const internalRevision = await getItemRevision(
        context.organizationId,
        internalItemRevisionId,
      );

      if (!internalRevision) {
        throw new CustomerItemRuleError("İç ürün revision'ı bulunamadı.", "NOT_FOUND");
      }

      /*
       * Eşleştirme, ilgili müşteri ürününün **ürününe** ait olmalıdır:
       * başka bir ürünün revision'ı eşleştirilemez.
       */
      if (internalRevision.itemId !== customerItemRecord.itemId) {
        throw new CustomerItemRuleError("Seçilen revision bu ürüne ait değil.", "INVALID_INPUT");
      }
    }

    const existing = await findCustomerItemRevisionByValue(
      context.organizationId,
      input.customerItemId,
      customerRevision,
    );

    if (existing) {
      throw new CustomerItemRuleError(
        "Bu müşteri revision değeri bu müşteri ürünü için zaten kullanılıyor.",
        "CONFLICT",
      );
    }

    const created = await tx
      .insert(customerItemRevision)
      .values({
        organizationId: context.organizationId,
        customerItemId: input.customerItemId,
        customerRevision,
        internalItemRevisionId,
        drawingReference: toNull(input.drawingReference),
        drawingRevision: toNull(input.drawingRevision),
        description: toNull(input.description),
        status: input.status,
        effectiveFrom: toNull(input.effectiveFrom),
      })
      .returning({ id: customerItemRevision.id });

    const revisionId = created[0]?.id;

    if (!revisionId) {
      throw new CustomerItemRuleError("Müşteri revision'ı oluşturulamadı.", "INVALID_INPUT");
    }

    await writeAuditLog(
      {
        organizationId: context.organizationId,
        actorId: context.userId,
        action: "customerItemRevision.created",
        target: { type: "customerItemRevision", id: revisionId },
        metadata: {
          customerItemId: input.customerItemId,
          customerRevision,
          internalItemRevisionId,
        },
      },
      tx,
    );

    return revisionId;
  });
}

/** Müşteri revision eşleştirmesini günceller. */
export async function updateCustomerItemRevision(
  context: AuthContext,
  revisionId: string,
  input: CustomerItemRevisionFormValues,
): Promise<void> {
  await requireCustomerItemPermission(context, "update");

  const customerRevision = input.customerRevision.trim();

  await db.transaction(async (tx) => {
    const target = await getCustomerItemRevision(context.organizationId, revisionId);

    if (!target) {
      throw new CustomerItemRuleError("Müşteri revision'ı bulunamadı.", "NOT_FOUND");
    }

    const customerItemRecord = await getCustomerItem(context.organizationId, input.customerItemId);

    if (!customerItemRecord) {
      throw new CustomerItemRuleError("Müşteri ürünü bulunamadı.", "NOT_FOUND");
    }

    const internalItemRevisionId = toNull(input.internalItemRevisionId);

    if (internalItemRevisionId) {
      const internalRevision = await getItemRevision(
        context.organizationId,
        internalItemRevisionId,
      );

      if (!internalRevision) {
        throw new CustomerItemRuleError("İç ürün revision'ı bulunamadı.", "NOT_FOUND");
      }

      if (internalRevision.itemId !== customerItemRecord.itemId) {
        throw new CustomerItemRuleError("Seçilen revision bu ürüne ait değil.", "INVALID_INPUT");
      }
    }

    const existing = await findCustomerItemRevisionByValue(
      context.organizationId,
      input.customerItemId,
      customerRevision,
      revisionId,
    );

    if (existing) {
      throw new CustomerItemRuleError(
        "Bu müşteri revision değeri bu müşteri ürünü için zaten kullanılıyor.",
        "CONFLICT",
      );
    }

    await tx
      .update(customerItemRevision)
      .set({
        customerItemId: input.customerItemId,
        customerRevision,
        internalItemRevisionId,
        drawingReference: toNull(input.drawingReference),
        drawingRevision: toNull(input.drawingRevision),
        description: toNull(input.description),
        status: input.status,
        effectiveFrom: toNull(input.effectiveFrom),
      })
      .where(
        and(
          eq(customerItemRevision.organizationId, context.organizationId),
          eq(customerItemRevision.id, revisionId),
        ),
      );

    await writeAuditLog(
      {
        organizationId: context.organizationId,
        actorId: context.userId,
        action: "customerItemRevision.updated",
        target: { type: "customerItemRevision", id: revisionId },
        metadata: { customerRevision },
      },
      tx,
    );
  });
}
