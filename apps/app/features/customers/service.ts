import { writeAuditLog } from "@mqdms/audit";
import { type AuthContext, hasPermission } from "@mqdms/auth/permissions/server";
import { db } from "@mqdms/db";
import { customer, customerContact, customerSite } from "@mqdms/db/schema";
import { and, eq } from "drizzle-orm";

import {
  countActiveProjectsByCustomer,
  findCustomerByCode,
  findCustomerSiteByCode,
  getCustomer,
  getCustomerContact,
  getCustomerSite,
  lockCustomer,
} from "./repository";
import type {
  CustomerContactFormValues,
  CustomerFormValues,
  CustomerSiteFormValues,
} from "./schema";

/**
 * İş kuralı ihlali.
 *
 * Sunucu tarafı hata sınıfı: aksiyon bu hata ile dönerse form genel bir
 * hata mesajı gösterir, yoksa iş kuralı ihlali sessizce yutulmaz.
 */
export class BusinessRuleError extends Error {
  constructor(
    message: string,
    readonly code: "NOT_FOUND" | "CONFLICT" | "INVALID_INPUT" | "FORBIDDEN",
  ) {
    super(message);
    this.name = "BusinessRuleError";
  }
}

/**
 * Yetki kontrolü.
 *
 * Servis katmanında yapılır: aksiyon, sayfa veya başka bir çağıran
 * yetkisiz bir yola ulaşsa bile kontrol kaçırılmaz.
 */
async function requireBusinessPermission(
  context: AuthContext,
  resource: string,
  action: string,
): Promise<void> {
  if (!(await hasPermission(context, resource, action))) {
    throw new BusinessRuleError("Bu işlem için yetkiniz yok.", "FORBIDDEN");
  }
}

/**
 * Kod normalizasyonu.
 *
 * Kod trim edilir, içteki boşluklar teke indirilir ve büyük harfe çevrilir:
 * " alpin " ile "ALPIN" aynı müşteriyi gösterir.
 */
export function normalizeCode(value: string): string {
  return value.trim().replace(/\s+/g, " ").toUpperCase();
}

/** Boş string'i `null`'a çevirir. */
function toNull(value: string | undefined): string | null {
  if (value === undefined) {
    return null;
  }

  const trimmed = value.trim();

  return trimmed === "" ? null : trimmed;
}

/** Ülke kodunu büyük harfe çevirir. */
function toCountryCode(value: string | undefined): string | null {
  return toNull(value)?.toUpperCase() ?? null;
}

/* -------------------------------------------------------------------------
 * Müşteri
 * ---------------------------------------------------------------------- */

/**
 * Müşteri oluşturur.
 *
 * Müşteri oluştururken site veya temsilci zorunlu değildir.
 */
export async function createCustomer(
  context: AuthContext,
  input: CustomerFormValues,
): Promise<string> {
  await requireBusinessPermission(context, "customers", "create");

  const code = normalizeCode(input.code);

  return db.transaction(async (tx) => {
    const existing = await findCustomerByCode(context.organizationId, code, undefined, tx);

    if (existing) {
      throw new BusinessRuleError("Bu müşteri kodu zaten kullanılıyor.", "CONFLICT");
    }

    const created = await tx
      .insert(customer)
      .values({
        organizationId: context.organizationId,
        code,
        name: input.name.trim(),
        legalName: toNull(input.legalName),
        description: toNull(input.description),
        website: toNull(input.website),
        countryCode: toCountryCode(input.countryCode),
        preferredLanguage: toNull(input.preferredLanguage),
        status: input.status,
        createdById: context.userId,
      })
      .returning({ id: customer.id });

    const customerId = created[0]?.id;

    if (!customerId) {
      throw new BusinessRuleError("Müşteri oluşturulamadı.", "INVALID_INPUT");
    }

    await writeAuditLog(
      {
        organizationId: context.organizationId,
        actorId: context.userId,
        action: "customer.created",
        target: { type: "customer", id: customerId },
        metadata: { code, name: input.name.trim() },
      },
      tx,
    );

    return customerId;
  });
}

/** Müşteriyi günceller. */
export async function updateCustomer(
  context: AuthContext,
  customerId: string,
  input: CustomerFormValues,
): Promise<void> {
  await requireBusinessPermission(context, "customers", "update");

  const code = normalizeCode(input.code);

  await db.transaction(async (tx) => {
    const target = await getCustomer(context.organizationId, customerId, tx);

    if (!target) {
      throw new BusinessRuleError("Müşteri bulunamadı.", "NOT_FOUND");
    }

    const existing = await findCustomerByCode(context.organizationId, code, customerId, tx);

    if (existing) {
      throw new BusinessRuleError("Bu müşteri kodu zaten kullanılıyor.", "CONFLICT");
    }

    await tx
      .update(customer)
      .set({
        code,
        name: input.name.trim(),
        legalName: toNull(input.legalName),
        description: toNull(input.description),
        website: toNull(input.website),
        countryCode: toCountryCode(input.countryCode),
        preferredLanguage: toNull(input.preferredLanguage),
        status: input.status,
      })
      .where(and(eq(customer.organizationId, context.organizationId), eq(customer.id, customerId)));

    await writeAuditLog(
      {
        organizationId: context.organizationId,
        actorId: context.userId,
        action: "customer.updated",
        target: { type: "customer", id: customerId },
        metadata: { code, name: input.name.trim() },
      },
      tx,
    );
  });
}

/**
 * Müşteriyi arşivler.
 *
 * Aktif projesi bulunan müşteri arşivlenemez: arşivlenen müşterinin
 * projeleri çalışmaya devam eder ve kayıt kaybolur.
 *
 * Arşiv, müşteri satırını kilit altında sayar. Proje yazımları da aynı satırı
 * kilitlediği için arşiv ile proje oluşturma serileşir: arşivlenmiş bir
 * müşterinin aktif projesi kalamaz.
 *
 * İlişkili kayıtlar (site, temsilci, proje) **fiziksel olarak silinmez**.
 */
export async function archiveCustomer(context: AuthContext, customerId: string): Promise<void> {
  await requireBusinessPermission(context, "customers", "archive");

  await db.transaction(async (tx) => {
    const target = await lockCustomer(tx, context.organizationId, customerId);

    if (!target) {
      throw new BusinessRuleError("Müşteri bulunamadı.", "NOT_FOUND");
    }

    if (target.archivedAt) {
      return;
    }

    const activeProjects = await countActiveProjectsByCustomer(
      context.organizationId,
      customerId,
      tx,
    );

    if (activeProjects > 0) {
      throw new BusinessRuleError(
        "Müşterinin aktif projeleri var. Önce projeleri tamamlayın veya arşivleyin.",
        "CONFLICT",
      );
    }

    await tx
      .update(customer)
      .set({ archivedAt: new Date() })
      .where(and(eq(customer.organizationId, context.organizationId), eq(customer.id, customerId)));

    await writeAuditLog(
      {
        organizationId: context.organizationId,
        actorId: context.userId,
        action: "customer.archived",
        target: { type: "customer", id: customerId },
        metadata: { code: target.code },
      },
      tx,
    );
  });
}

/** Müşteriyi arşivden çıkarır. */
export async function restoreCustomer(context: AuthContext, customerId: string): Promise<void> {
  await requireBusinessPermission(context, "customers", "restore");

  await db.transaction(async (tx) => {
    const target = await lockCustomer(tx, context.organizationId, customerId);

    if (!target) {
      throw new BusinessRuleError("Müşteri bulunamadı.", "NOT_FOUND");
    }

    if (!target.archivedAt) {
      return;
    }

    await tx
      .update(customer)
      .set({ archivedAt: null })
      .where(and(eq(customer.organizationId, context.organizationId), eq(customer.id, customerId)));

    await writeAuditLog(
      {
        organizationId: context.organizationId,
        actorId: context.userId,
        action: "customer.restored",
        target: { type: "customer", id: customerId },
        metadata: { code: target.code },
      },
      tx,
    );
  });
}

/* -------------------------------------------------------------------------
 * Müşteri sitesi
 * ---------------------------------------------------------------------- */

/** Müşteriye yeni site ekler. */
export async function createCustomerSite(
  context: AuthContext,
  input: CustomerSiteFormValues,
): Promise<string> {
  await requireBusinessPermission(context, "customers", "create");

  const code = normalizeCode(input.code);

  return db.transaction(async (tx) => {
    const target = await getCustomer(context.organizationId, input.customerId, tx);

    if (!target || target.archivedAt) {
      throw new BusinessRuleError("Müşteri bulunamadı.", "NOT_FOUND");
    }

    const existing = await findCustomerSiteByCode(
      context.organizationId,
      input.customerId,
      code,
      undefined,
      tx,
    );

    if (existing) {
      throw new BusinessRuleError("Bu site kodu bu müşteri içinde zaten kullanılıyor.", "CONFLICT");
    }

    const created = await tx
      .insert(customerSite)
      .values({
        organizationId: context.organizationId,
        customerId: input.customerId,
        code,
        name: input.name.trim(),
        countryCode: toCountryCode(input.countryCode),
        city: toNull(input.city),
        address: toNull(input.address),
        postalCode: toNull(input.postalCode),
        description: toNull(input.description),
        status: input.status,
        createdById: context.userId,
      })
      .returning({ id: customerSite.id });

    const siteId = created[0]?.id;

    if (!siteId) {
      throw new BusinessRuleError("Site oluşturulamadı.", "INVALID_INPUT");
    }

    await writeAuditLog(
      {
        organizationId: context.organizationId,
        actorId: context.userId,
        action: "customerSite.created",
        target: { type: "customerSite", id: siteId },
        metadata: { customerId: input.customerId, code, name: input.name.trim() },
      },
      tx,
    );

    return siteId;
  });
}

/** Müşteri sitesini günceller. */
export async function updateCustomerSite(
  context: AuthContext,
  siteId: string,
  input: CustomerSiteFormValues,
): Promise<void> {
  await requireBusinessPermission(context, "customers", "update");

  const code = normalizeCode(input.code);

  await db.transaction(async (tx) => {
    const target = await getCustomerSite(context.organizationId, siteId, tx);

    if (!target) {
      throw new BusinessRuleError("Site bulunamadı.", "NOT_FOUND");
    }

    const existing = await findCustomerSiteByCode(
      context.organizationId,
      target.customerId,
      code,
      siteId,
      tx,
    );

    if (existing) {
      throw new BusinessRuleError("Bu site kodu bu müşteri içinde zaten kullanılıyor.", "CONFLICT");
    }

    await tx
      .update(customerSite)
      .set({
        code,
        name: input.name.trim(),
        countryCode: toCountryCode(input.countryCode),
        city: toNull(input.city),
        address: toNull(input.address),
        postalCode: toNull(input.postalCode),
        description: toNull(input.description),
        status: input.status,
      })
      .where(
        and(eq(customerSite.organizationId, context.organizationId), eq(customerSite.id, siteId)),
      );

    await writeAuditLog(
      {
        organizationId: context.organizationId,
        actorId: context.userId,
        action: "customerSite.updated",
        target: { type: "customerSite", id: siteId },
        metadata: { customerId: target.customerId, code },
      },
      tx,
    );
  });
}

/** Müşteri sitesini arşivler. */
export async function archiveCustomerSite(context: AuthContext, siteId: string): Promise<void> {
  await requireBusinessPermission(context, "customers", "archive");

  await db.transaction(async (tx) => {
    const target = await getCustomerSite(context.organizationId, siteId, tx);

    if (!target) {
      throw new BusinessRuleError("Site bulunamadı.", "NOT_FOUND");
    }

    if (target.archivedAt) {
      return;
    }

    await tx
      .update(customerSite)
      .set({ archivedAt: new Date() })
      .where(
        and(eq(customerSite.organizationId, context.organizationId), eq(customerSite.id, siteId)),
      );

    await writeAuditLog(
      {
        organizationId: context.organizationId,
        actorId: context.userId,
        action: "customerSite.archived",
        target: { type: "customerSite", id: siteId },
        metadata: { customerId: target.customerId, code: target.code },
      },
      tx,
    );
  });
}

/* -------------------------------------------------------------------------
 * Müşteri temsilcisi
 * ---------------------------------------------------------------------- */

/**
 * Müşteri temsilcisi oluşturur.
 *
 * Temsilci bir mQDMS kullanıcısı **değildir**: hiçbir kullanıcı veya
 * organizasyon üyeliği oluşturulmaz.
 */
export async function createCustomerContact(
  context: AuthContext,
  input: CustomerContactFormValues,
): Promise<string> {
  await requireBusinessPermission(context, "customers", "create");

  const customerSiteId = toNull(input.customerSiteId);

  return db.transaction(async (tx) => {
    const target = await getCustomer(context.organizationId, input.customerId, tx);

    if (!target || target.archivedAt) {
      throw new BusinessRuleError("Müşteri bulunamadı.", "NOT_FOUND");
    }

    // Site seçildiyse site gerçekten bu müşteriye ait olmalıdır.
    if (customerSiteId) {
      const site = await getCustomerSite(context.organizationId, customerSiteId, tx);

      if (!site || site.customerId !== input.customerId) {
        throw new BusinessRuleError("Seçilen site bu müşteriye ait değil.", "INVALID_INPUT");
      }
    }

    const created = await tx
      .insert(customerContact)
      .values({
        organizationId: context.organizationId,
        customerId: input.customerId,
        customerSiteId,
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        jobTitle: toNull(input.jobTitle),
        department: toNull(input.department),
        email: toNull(input.email),
        phone: toNull(input.phone),
        contactType: input.contactType,
        notes: toNull(input.notes),
        status: input.status,
        createdById: context.userId,
      })
      .returning({ id: customerContact.id });

    const contactId = created[0]?.id;

    if (!contactId) {
      throw new BusinessRuleError("Temsilci oluşturulamadı.", "INVALID_INPUT");
    }

    await writeAuditLog(
      {
        organizationId: context.organizationId,
        actorId: context.userId,
        action: "customerContact.created",
        target: { type: "customerContact", id: contactId },
        metadata: {
          customerId: input.customerId,
          contactType: input.contactType,
        },
      },
      tx,
    );

    return contactId;
  });
}

/** Müşteri temsilcisini günceller. */
export async function updateCustomerContact(
  context: AuthContext,
  contactId: string,
  input: CustomerContactFormValues,
): Promise<void> {
  await requireBusinessPermission(context, "customers", "update");

  const customerSiteId = toNull(input.customerSiteId);

  await db.transaction(async (tx) => {
    const target = await getCustomerContact(context.organizationId, contactId, tx);

    if (!target) {
      throw new BusinessRuleError("Temsilci bulunamadı.", "NOT_FOUND");
    }

    if (customerSiteId) {
      const site = await getCustomerSite(context.organizationId, customerSiteId, tx);

      if (!site || site.customerId !== target.customerId) {
        throw new BusinessRuleError("Seçilen site bu müşteriye ait değil.", "INVALID_INPUT");
      }
    }

    await tx
      .update(customerContact)
      .set({
        customerSiteId,
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        jobTitle: toNull(input.jobTitle),
        department: toNull(input.department),
        email: toNull(input.email),
        phone: toNull(input.phone),
        contactType: input.contactType,
        notes: toNull(input.notes),
        status: input.status,
      })
      .where(
        and(
          eq(customerContact.organizationId, context.organizationId),
          eq(customerContact.id, contactId),
        ),
      );

    await writeAuditLog(
      {
        organizationId: context.organizationId,
        actorId: context.userId,
        action: "customerContact.updated",
        target: { type: "customerContact", id: contactId },
        metadata: { customerId: target.customerId },
      },
      tx,
    );
  });
}

/** Müşteri temsilcisini arşivler. */
export async function archiveCustomerContact(
  context: AuthContext,
  contactId: string,
): Promise<void> {
  await requireBusinessPermission(context, "customers", "archive");

  await db.transaction(async (tx) => {
    const target = await getCustomerContact(context.organizationId, contactId, tx);

    if (!target) {
      throw new BusinessRuleError("Temsilci bulunamadı.", "NOT_FOUND");
    }

    if (target.archivedAt) {
      return;
    }

    await tx
      .update(customerContact)
      .set({ archivedAt: new Date() })
      .where(
        and(
          eq(customerContact.organizationId, context.organizationId),
          eq(customerContact.id, contactId),
        ),
      );

    await writeAuditLog(
      {
        organizationId: context.organizationId,
        actorId: context.userId,
        action: "customerContact.archived",
        target: { type: "customerContact", id: contactId },
        metadata: { customerId: target.customerId },
      },
      tx,
    );
  });
}
