import { index, pgEnum, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

import { organization, user } from "../initial/auth";

/** Tesisin durumu. */
export const plantStatus = pgEnum("plant_status", ["ACTIVE", "INACTIVE"]);

/**
 * Organizasyonun kendi üretim tesisi.
 *
 * Örnek: Alpin Kimya → Ovaakça, Teknosab.
 *
 * Plant, müşterinin tesisi olan `customer_site` kaydından **bağımsızdır**:
 * site müşteriye aittir, plant organizasyona aittir. Aynı organizasyon
 * içinde birden fazla plant bulunabilir ve bir proje birden fazla plant'ta
 * yürütülebilir.
 */
export const plant = pgTable(
  "plant",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),

    /** Kısa tanımlayıcı; organizasyon içinde unique. */
    code: text("code").notNull(),

    name: text("name").notNull(),

    description: text("description"),

    /** ISO 3166-1 alpha-2 ülke kodu. */
    countryCode: text("country_code"),

    city: text("city"),

    address: text("address"),

    postalCode: text("postal_code"),

    /** IANA saat dilimi (ör. `Europe/Istanbul`). */
    timezone: text("timezone"),

    status: plantStatus("status").notNull().default("ACTIVE"),

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
     * Arşiv fiziksel silme değildir. Bağlı aktif projeler bulunan bir plant
     * arşivlenemez; bu kural servis katmanında denetlenir.
     */
    archivedAt: timestamp("archived_at", { withTimezone: true }),
  },
  (table) => [
    /*
     * Composite unique: `project_plant` tablosunun (organization_id, plant_id)
     * yabancı anahtarını destekler.
     *
     * `unique` constraint olarak tanımlanır, `uniqueIndex` olarak değil:
     * PostgreSQL bir yabancı anahtar hedefi olarak yalnızca *constraint*
     * kabul eder ve Drizzle index'leri FK'lerden sonra oluşturur.
     */
    unique("plant_organization_id_id_unique").on(table.organizationId, table.id),

    // Aynı organizasyonda aynı tesis kodu olamaz.
    unique("plant_organization_id_code_unique").on(table.organizationId, table.code),

    index("plant_organization_id_idx").on(table.organizationId),
    index("plant_archived_at_idx").on(table.archivedAt),
  ],
);

/*
 * `plant` için `relations()` tanımı yapılmaz: `project_plant` tablosu bu
 * dosyayı içe aktarır ve ters yönde bir import döngüsü oluşturur. Bağlantı
 * `pms/project.ts` tarafından tanımlanır.
 */
