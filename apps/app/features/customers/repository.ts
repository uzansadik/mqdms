import { type DbClient, db } from "@mqdms/db";
import { customer, customerContact, customerSite, project } from "@mqdms/db/schema";
import { getPublicObjectUrl } from "@mqdms/storage/server";
import { and, asc, count, eq, ilike, isNull, or, type SQL, sql } from "drizzle-orm";

/**
 * Müşteri okuma katmanı.
 *
 * Bütün sorgular `organizationId` ile kısıtlanır: bir organizasyon başka bir
 * organizasyonun müşteri, site veya temsilci kaydını göremez.
 *
 * Yazma yolları, kayıt ile audit kaydını tek transaction'da yazabilmek için
 * sorgulara istemci parametresi alır.
 */

export type CustomerListQuery = {
  /** Sorgunun kapsandığı organizasyon. */
  organizationId: string;

  /** Kod veya ad üzerinde serbest arama. */
  query?: string;

  /** Durum filtresi; `ALL` filtre uygulamaz. */
  status?: "ACTIVE" | "INACTIVE" | "ALL";

  /** Arşivlenen kayıtlar listelenir mi? */
  archived?: boolean;

  page: number;
  pageSize: number;
};

export type CustomerListItem = {
  id: string;
  code: string;
  name: string;
  legalName: string | null;
  countryCode: string | null;
  status: "ACTIVE" | "INACTIVE";
  siteCount: number;
  activeProjectCount: number;

  /** Logonun görüntülenebilir adresi. */
  logoUrl: string | null;
  createdAt: Date;
  archivedAt: Date | null;
};

export type CustomerRecord = {
  id: string;
  organizationId: string;
  code: string;
  name: string;
  legalName: string | null;
  description: string | null;
  website: string | null;
  countryCode: string | null;
  preferredLanguage: string | null;
  logoKey: string | null;
  status: "ACTIVE" | "INACTIVE";
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
};

export type CustomerSiteRecord = {
  id: string;
  customerId: string;
  code: string;
  name: string;
  countryCode: string | null;
  city: string | null;
  address: string | null;
  postalCode: string | null;
  description: string | null;
  status: "ACTIVE" | "INACTIVE";
  archivedAt: Date | null;
};

export type CustomerContactRecord = {
  id: string;
  customerId: string;
  customerSiteId: string | null;
  firstName: string;
  lastName: string;
  jobTitle: string | null;
  department: string | null;
  email: string | null;
  phone: string | null;
  contactType: "QUALITY" | "PROJECT" | "PURCHASING" | "ENGINEERING" | "LOGISTICS" | "OTHER";
  notes: string | null;
  status: "ACTIVE" | "INACTIVE";
  archivedAt: Date | null;
};

/**
 * Müşteri filtresini SQL koşullarına çevirir.
 *
 * Arşiv filtresi `archivedAt` üzerinden yapılır: arşivlenen kayıt normal
 * listelerde görünmez, arşiv listesinde yalnızca arşivlenenler görünür.
 */
function customerFilters(query: CustomerListQuery): SQL[] {
  const conditions: SQL[] = [eq(customer.organizationId, query.organizationId)];

  if (query.archived) {
    conditions.push(sql`${customer.archivedAt} is not null`);
  } else {
    conditions.push(isNull(customer.archivedAt));
  }

  if (query.status && query.status !== "ALL") {
    conditions.push(eq(customer.status, query.status));
  }

  if (query.query) {
    const pattern = `%${query.query.trim()}%`;

    const search = or(ilike(customer.code, pattern), ilike(customer.name, pattern));

    if (search) {
      conditions.push(search);
    }
  }

  return conditions;
}

/**
 * Müşteri listesi sorgusu.
 *
 * Sorgu kurucusu ayrıdır: sayaç alt sorgularının üretilen SQL'i test
 * edilir (bkz. `customers.repository.test.ts`).
 */
export function buildCustomerListQuery(query: CustomerListQuery) {
  return db
    .select({
      id: customer.id,
      code: customer.code,
      name: customer.name,
      legalName: customer.legalName,
      countryCode: customer.countryCode,
      status: customer.status,
      createdAt: customer.createdAt,
      archivedAt: customer.archivedAt,
      logoKey: customer.logoKey,

      /*
       * Sayaç alt sorgularında dış tablo **nitelikli** yazılır.
       *
       * Drizzle'in tek tablo (join'siz) seçim optimizasyonu, ham SQL içindeki
       * kolon referanslarını niteliksizleştirir: `customer.id` → `"id"`. Alt
       * sorgunun tablosu aynı kolon adına sahip olduğu için korelasyon bozulur
       * ve sayaç kendine referanslı (`customer_site.customer_id = "id"`)
       * hâle gelerek daima 0 döner.
       */
      siteCount: sql<number>`(
        select count(*)::int from ${customerSite}
        where ${customerSite.customerId} = ${sql.identifier("customer")}.${sql.identifier("id")}
          and ${customerSite.archivedAt} is null
      )`,

      /* Arşivlenmemiş ve iptal edilmemiş aktif proje sayısı. */
      activeProjectCount: sql<number>`(
        select count(*)::int from ${project}
        where ${project.customerId} = ${sql.identifier("customer")}.${sql.identifier("id")}
          and ${project.status} = 'ACTIVE'
          and ${project.archivedAt} is null
      )`,
    })
    .from(customer)
    .where(and(...customerFilters(query)))
    .orderBy(asc(customer.name))
    .limit(query.pageSize)
    .offset((query.page - 1) * query.pageSize);
}

/** Müşteri listesi. */
export async function listCustomers(query: CustomerListQuery): Promise<CustomerListItem[]> {
  const rows = await buildCustomerListQuery(query);

  /* Logolar depolamadan sunulur; adres sunucuda hesaplanır. */
  return rows.map((row) => ({
    ...row,
    logoUrl: row.logoKey ? getPublicObjectUrl(row.logoKey) : null,
  }));
}

/** Müşteri listesi için toplam kayıt sayısı. */
export async function countCustomers(query: CustomerListQuery): Promise<number> {
  const rows = await db
    .select({ value: count() })
    .from(customer)
    .where(and(...customerFilters(query)));

  return rows[0]?.value ?? 0;
}

/** Tek müşteri kaydı. */
export async function getCustomer(
  organizationId: string,
  customerId: string,
  client: DbClient | typeof db = db,
): Promise<CustomerRecord | null> {
  const rows = await client
    .select({
      id: customer.id,
      organizationId: customer.organizationId,
      code: customer.code,
      name: customer.name,
      legalName: customer.legalName,
      description: customer.description,
      website: customer.website,
      countryCode: customer.countryCode,
      preferredLanguage: customer.preferredLanguage,
      logoKey: customer.logoKey,
      status: customer.status,
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
      archivedAt: customer.archivedAt,
    })
    .from(customer)
    .where(and(eq(customer.organizationId, organizationId), eq(customer.id, customerId)))
    .limit(1);

  return rows[0] ?? null;
}

/**
 * Müşteri satırını kilitler ve kaydı okur.
 *
 * Müşteri arşivi ile projeye yazma bu satır üzerinde serileşir: arşiv işlemi
 * aktif proje sayısını kilit altında sayar, proje yazımı ise kilidi alarak
 * müşterinin arşivlenmediğini doğrular. Böylece arşivlenmiş bir müşterinin
 * aktif projesi kalmaz.
 */
export async function lockCustomer(
  tx: DbClient,
  organizationId: string,
  customerId: string,
): Promise<CustomerRecord | null> {
  const rows = await tx
    .select({
      id: customer.id,
      organizationId: customer.organizationId,
      code: customer.code,
      name: customer.name,
      legalName: customer.legalName,
      description: customer.description,
      website: customer.website,
      countryCode: customer.countryCode,
      preferredLanguage: customer.preferredLanguage,
      logoKey: customer.logoKey,
      status: customer.status,
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
      archivedAt: customer.archivedAt,
    })
    .from(customer)
    .where(and(eq(customer.organizationId, organizationId), eq(customer.id, customerId)))
    .for("update")
    .limit(1);

  return rows[0] ?? null;
}

/**
 * Müşteri kodu organizasyon içinde unique olmalıdır.
 *
 * Arşivlenen kayıtlar da unique kapsamındadır: arşivlenmiş bir kod yeniden
 * kullanılamaz, aksi halde arşivden çıkan kayıt çakışır.
 */
export async function findCustomerByCode(
  organizationId: string,
  code: string,
  excludeId?: string,
  client: DbClient | typeof db = db,
): Promise<CustomerRecord | null> {
  const rows = await client
    .select({
      id: customer.id,
      organizationId: customer.organizationId,
      code: customer.code,
      name: customer.name,
      legalName: customer.legalName,
      description: customer.description,
      website: customer.website,
      countryCode: customer.countryCode,
      preferredLanguage: customer.preferredLanguage,
      logoKey: customer.logoKey,
      status: customer.status,
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
      archivedAt: customer.archivedAt,
    })
    .from(customer)
    .where(
      and(
        eq(customer.organizationId, organizationId),
        eq(customer.code, code),
        excludeId ? sql`${customer.id} <> ${excludeId}` : undefined,
      ),
    )
    .limit(1);

  return rows[0] ?? null;
}

/** Müşterinin siteleri. */
export async function listCustomerSites(
  organizationId: string,
  customerId: string,
): Promise<CustomerSiteRecord[]> {
  return db
    .select({
      id: customerSite.id,
      customerId: customerSite.customerId,
      code: customerSite.code,
      name: customerSite.name,
      countryCode: customerSite.countryCode,
      city: customerSite.city,
      address: customerSite.address,
      postalCode: customerSite.postalCode,
      description: customerSite.description,
      status: customerSite.status,
      archivedAt: customerSite.archivedAt,
    })
    .from(customerSite)
    .where(
      and(
        eq(customerSite.organizationId, organizationId),
        eq(customerSite.customerId, customerId),
        isNull(customerSite.archivedAt),
      ),
    )
    .orderBy(asc(customerSite.name));
}

/** Tek site kaydı. */
export async function getCustomerSite(
  organizationId: string,
  siteId: string,
  client: DbClient | typeof db = db,
): Promise<CustomerSiteRecord | null> {
  const rows = await client
    .select({
      id: customerSite.id,
      customerId: customerSite.customerId,
      code: customerSite.code,
      name: customerSite.name,
      countryCode: customerSite.countryCode,
      city: customerSite.city,
      address: customerSite.address,
      postalCode: customerSite.postalCode,
      description: customerSite.description,
      status: customerSite.status,
      archivedAt: customerSite.archivedAt,
    })
    .from(customerSite)
    .where(and(eq(customerSite.organizationId, organizationId), eq(customerSite.id, siteId)))
    .limit(1);

  return rows[0] ?? null;
}

/** Site kodu müşteri içinde unique olmalıdır. */
export async function findCustomerSiteByCode(
  organizationId: string,
  customerId: string,
  code: string,
  excludeId?: string,
  client: DbClient | typeof db = db,
): Promise<CustomerSiteRecord | null> {
  const rows = await client
    .select({
      id: customerSite.id,
      customerId: customerSite.customerId,
      code: customerSite.code,
      name: customerSite.name,
      countryCode: customerSite.countryCode,
      city: customerSite.city,
      address: customerSite.address,
      postalCode: customerSite.postalCode,
      description: customerSite.description,
      status: customerSite.status,
      archivedAt: customerSite.archivedAt,
    })
    .from(customerSite)
    .where(
      and(
        eq(customerSite.organizationId, organizationId),
        eq(customerSite.customerId, customerId),
        eq(customerSite.code, code),
        excludeId ? sql`${customerSite.id} <> ${excludeId}` : undefined,
      ),
    )
    .limit(1);

  return rows[0] ?? null;
}

/** Müşterinin temsilcileri. */
export async function listCustomerContacts(
  organizationId: string,
  customerId: string,
): Promise<CustomerContactRecord[]> {
  return db
    .select({
      id: customerContact.id,
      customerId: customerContact.customerId,
      customerSiteId: customerContact.customerSiteId,
      firstName: customerContact.firstName,
      lastName: customerContact.lastName,
      jobTitle: customerContact.jobTitle,
      department: customerContact.department,
      email: customerContact.email,
      phone: customerContact.phone,
      contactType: customerContact.contactType,
      notes: customerContact.notes,
      status: customerContact.status,
      archivedAt: customerContact.archivedAt,
    })
    .from(customerContact)
    .where(
      and(
        eq(customerContact.organizationId, organizationId),
        eq(customerContact.customerId, customerId),
        isNull(customerContact.archivedAt),
      ),
    )
    .orderBy(asc(customerContact.firstName), asc(customerContact.lastName));
}

/** Tek temsilci kaydı. */
export async function getCustomerContact(
  organizationId: string,
  contactId: string,
  client: DbClient | typeof db = db,
): Promise<CustomerContactRecord | null> {
  const rows = await client
    .select({
      id: customerContact.id,
      customerId: customerContact.customerId,
      customerSiteId: customerContact.customerSiteId,
      firstName: customerContact.firstName,
      lastName: customerContact.lastName,
      jobTitle: customerContact.jobTitle,
      department: customerContact.department,
      email: customerContact.email,
      phone: customerContact.phone,
      contactType: customerContact.contactType,
      notes: customerContact.notes,
      status: customerContact.status,
      archivedAt: customerContact.archivedAt,
    })
    .from(customerContact)
    .where(
      and(eq(customerContact.organizationId, organizationId), eq(customerContact.id, contactId)),
    )
    .limit(1);

  return rows[0] ?? null;
}

/**
 * Müşterinin aktif proje sayısı.
 *
 * Müşteri arşivlenirken kontrol edilir: aktif projesi olan bir müşteri
 * arşivlenemez.
 */
export async function countActiveProjectsByCustomer(
  organizationId: string,
  customerId: string,
  client: DbClient | typeof db = db,
): Promise<number> {
  const rows = await client
    .select({ value: count() })
    .from(project)
    .where(
      and(
        eq(project.organizationId, organizationId),
        eq(project.customerId, customerId),
        eq(project.status, "ACTIVE"),
        isNull(project.archivedAt),
      ),
    );

  return rows[0]?.value ?? 0;
}

/**
 * Form seçim listesi için müşteriler.
 *
 * Yalnızca arşivlenmemiş ve etkin müşteriler döner; arşivlenen müşteriye
 * yeni site, temsilci veya proje bağlanamaz.
 */
export async function listCustomerOptions(
  organizationId: string,
): Promise<{ id: string; code: string; name: string }[]> {
  return db
    .select({ id: customer.id, code: customer.code, name: customer.name })
    .from(customer)
    .where(
      and(
        eq(customer.organizationId, organizationId),
        isNull(customer.archivedAt),
        eq(customer.status, "ACTIVE"),
      ),
    )
    .orderBy(asc(customer.name));
}

/**
 * Form seçim listesi için müşteri siteleri.
 *
 * Proje formunda site seçimi müşteriye göre filtrelenir; tüm siteler
 * istemciye gönderilip seçilen müşteriye göre süzülür.
 */
export async function listAllCustomerSiteOptions(
  organizationId: string,
): Promise<{ id: string; customerId: string; code: string; name: string }[]> {
  return db
    .select({
      id: customerSite.id,
      customerId: customerSite.customerId,
      code: customerSite.code,
      name: customerSite.name,
    })
    .from(customerSite)
    .where(
      and(
        eq(customerSite.organizationId, organizationId),
        isNull(customerSite.archivedAt),
        eq(customerSite.status, "ACTIVE"),
      ),
    )
    .orderBy(asc(customerSite.name));
}

/** Müşterinin projeleri (özet). */
export async function listProjectsByCustomer(
  organizationId: string,
  customerId: string,
): Promise<
  {
    id: string;
    code: string;
    name: string;
    status: "DRAFT" | "ACTIVE" | "ON_HOLD" | "COMPLETED" | "CANCELLED";
    archivedAt: Date | null;
  }[]
> {
  return db
    .select({
      id: project.id,
      code: project.code,
      name: project.name,
      status: project.status,
      archivedAt: project.archivedAt,
    })
    .from(project)
    .where(
      and(
        eq(project.organizationId, organizationId),
        eq(project.customerId, customerId),
        isNull(project.archivedAt),
      ),
    )
    .orderBy(asc(project.name));
}
