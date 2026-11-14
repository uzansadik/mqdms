import { relations } from "drizzle-orm";
import {
  foreignKey,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { organization, user } from "../initial/auth";

/**
 * Müşteri, tesis ve temsilci kayıtlarının ortak durumu.
 *
 * Üç tablo da aynı durum setini kullanır; ayrı enum'lar aynı değerleri
 * tekrar etmekten başka bir şey katmaz.
 */
export const customerStatus = pgEnum("customer_status", ["ACTIVE", "INACTIVE"]);

/**
 * Müşteri firması.
 *
 * Örnek: Alstom, Karsan, MAN. Bir müşteri birden fazla site'a, projeye ve
 * temsilciye sahip olabilir.
 *
 * `organization_id` her kaydın ait olduğu organizasyonu belirler. Aynı
 * müşteri adı farklı organizasyonlarda kullanılabilir; kod alanı ise
 * organizasyon içinde unique'tir.
 */
export const customer = pgTable(
  "customer",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),

    /** Kısa tanımlayıcı; organizasyon içinde unique. */
    code: text("code").notNull(),

    name: text("name").notNull(),

    /** Resmi ünvan; `name` ile aynı olmak zorunda değildir. */
    legalName: text("legal_name"),

    description: text("description"),

    website: text("website"),

    /** ISO 3166-1 alpha-2 ülke kodu (ör. `DE`). */
    countryCode: text("country_code"),

    /** Tercih edilen iletişim dili (ör. `de`, `tr`). */
    preferredLanguage: text("preferred_language"),

    /**
     * Müşteri logosunun depolamadaki nesne anahtarı.
     *
     * Dosya içeriği veritabanında tutulmaz; nesne anahtarı saklanır ve
     * görüntü `STORAGE_PUBLIC_URL` üzerinden sunulur.
     */
    logoKey: text("logo_key"),

    status: customerStatus("status").notNull().default("ACTIVE"),

    createdById: text("created_by_id").references(() => user.id, { onDelete: "set null" }),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at", {
      withTimezone: true,
    })
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),

    /**
     * Arşivlenme zamanı.
     *
     * Arşiv fiziksel silme değildir: kayıt ve ilişkileri korunur, kayıt
     * listelerde varsayılan olarak görünmez.
     */
    archivedAt: timestamp("archived_at", { withTimezone: true }),
  },
  (table) => [
    /*
     * Composite unique: alt tabloların (organization_id, customer_id)
     * yabancı anahtarını destekler.
     *
     * `unique` constraint olarak tanımlanır, `uniqueIndex` olarak değil:
     * PostgreSQL bir yabancı anahtar hedefi olarak yalnızca *constraint*
     * kabul eder ve Drizzle index'leri FK'lerden sonra oluşturur.
     */
    unique("customer_organization_id_id_unique").on(table.organizationId, table.id),

    // Aynı organizasyonda aynı müşteri kodu olamaz.
    unique("customer_organization_id_code_unique").on(table.organizationId, table.code),

    index("customer_organization_id_idx").on(table.organizationId),
    index("customer_archived_at_idx").on(table.archivedAt),
  ],
);

/**
 * Müşterinin fabrikası, üretim tesisi veya teslimat lokasyonu.
 *
 * Örnek: Alstom → Salzgitter, Hennigsdorf.
 *
 * Bu tablo organizasyonun **kendi** tesisini tutan `plant` tablosundan
 * ayrıdır: site müşteriye aittir, plant organizasyona aittir.
 */
export const customerSite = pgTable(
  "customer_site",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),

    customerId: uuid("customer_id").notNull(),

    /** Müşteri içinde unique. */
    code: text("code").notNull(),

    name: text("name").notNull(),

    countryCode: text("country_code"),

    city: text("city"),

    address: text("address"),

    postalCode: text("postal_code"),

    description: text("description"),

    status: customerStatus("status").notNull().default("ACTIVE"),

    createdById: text("created_by_id").references(() => user.id, { onDelete: "set null" }),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at", {
      withTimezone: true,
    })
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),

    archivedAt: timestamp("archived_at", { withTimezone: true }),
  },
  (table) => [
    unique("customer_site_organization_id_id_unique").on(table.organizationId, table.id),

    // Site kodu müşteri içinde unique.
    unique("customer_site_customer_id_code_unique").on(table.customerId, table.code),

    /*
     * Temsilcinin hem müşteriyle hem site ile eşleşmesini sağlayan hedef:
     * `customer_contact` bu ikiliyi foreign key olarak kullanır.
     */
    unique("customer_site_customer_id_id_unique").on(table.customerId, table.id),

    /*
     * Site ve müşteri aynı organizasyona ait olmak zorundadır; aksi halde
     * başka bir organizasyonun müşterisine site bağlanabilirdi.
     */
    foreignKey({
      columns: [table.organizationId, table.customerId],
      foreignColumns: [customer.organizationId, customer.id],
      name: "customer_site_customer_org_fk",
    }).onDelete("cascade"),

    index("customer_site_organization_id_idx").on(table.organizationId),
    index("customer_site_customer_id_idx").on(table.customerId),
    index("customer_site_archived_at_idx").on(table.archivedAt),
  ],
);

/** Temsilcinin müşteriyle ilişkisi. */
export const customerContactType = pgEnum("customer_contact_type", [
  "QUALITY",
  "PROJECT",
  "PURCHASING",
  "ENGINEERING",
  "LOGISTICS",
  "OTHER",
]);

/**
 * Müşteri temsilcisi.
 *
 * Temsilci bir mQDMS kullanıcısı **değildir**: temsilci kaydı otomatik
 * kullanıcı veya organizasyon üyeliği oluşturmaz.
 */
export const customerContact = pgTable(
  "customer_contact",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),

    customerId: uuid("customer_id").notNull(),

    /** Temsilci belirli bir site'a bağlıysa. */
    customerSiteId: uuid("customer_site_id"),

    firstName: text("first_name").notNull(),

    lastName: text("last_name").notNull(),

    jobTitle: text("job_title"),

    department: text("department"),

    email: text("email"),

    phone: text("phone"),

    contactType: customerContactType("contact_type").notNull().default("OTHER"),

    notes: text("notes"),

    status: customerStatus("status").notNull().default("ACTIVE"),

    createdById: text("created_by_id").references(() => user.id, { onDelete: "set null" }),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at", {
      withTimezone: true,
    })
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),

    archivedAt: timestamp("archived_at", { withTimezone: true }),
  },
  (table) => [
    unique("customer_contact_organization_id_id_unique").on(table.organizationId, table.id),

    /*
     * Temsilci ve müşteri aynı organizasyona ait olmak zorundadır.
     */
    foreignKey({
      columns: [table.organizationId, table.customerId],
      foreignColumns: [customer.organizationId, customer.id],
      name: "customer_contact_customer_org_fk",
    }).onDelete("cascade"),

    /*
     * Site seçilmişse site, temsilcinin müşterisine ait olmak zorundadır.
     * Site temsilcinin müşterisine ait değilse FK reddedilir.
     *
     * `customer_site_id` boşsa (müşteri geneli temsilci) kısıt sağlanmaz.
     */
    foreignKey({
      columns: [table.customerId, table.customerSiteId],
      foreignColumns: [customerSite.customerId, customerSite.id],
      name: "customer_contact_site_customer_fk",
    }).onDelete("cascade"),

    index("customer_contact_organization_id_idx").on(table.organizationId),
    index("customer_contact_customer_id_idx").on(table.customerId),
    index("customer_contact_customer_site_id_idx").on(table.customerSiteId),
    index("customer_contact_archived_at_idx").on(table.archivedAt),
  ],
);

export const customerRelations = relations(customer, ({ many }) => ({
  sites: many(customerSite),
  contacts: many(customerContact),
}));

export const customerSiteRelations = relations(customerSite, ({ one, many }) => ({
  customer: one(customer, {
    fields: [customerSite.customerId],
    references: [customer.id],
  }),
  contacts: many(customerContact),
}));

export const customerContactRelations = relations(customerContact, ({ one }) => ({
  customer: one(customer, {
    fields: [customerContact.customerId],
    references: [customer.id],
  }),
  site: one(customerSite, {
    fields: [customerContact.customerSiteId],
    references: [customerSite.id],
  }),
}));
