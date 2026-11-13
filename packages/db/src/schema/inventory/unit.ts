import {
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { organization, user } from "../initial/auth";
import { recordStatus, unitDimension } from "./enums";

/**
 * Ölçüm birimi.
 *
 * Birimler organizasyona özeldir ve yönetilebilir: ERP'den gelen birim
 * kodları mQDMS birimlerine eşleştirilir.
 *
 * `conversionFactor`, 1 birimin boyutun **taban birimi** karşılığı kaç olduğunu
 * belirtir. `null` olan birim boyutun taban birimidir. Dönüşüm yalnızca iki
 * birim de aynı boyutta ve ikisinin de faktörü tanımlıysa yapılır; aksi halde
 * miktar tahmin edilmez, satır çözümlenmemiş olarak gösterilir.
 */
export const itemUnit = pgTable(
  "item_unit",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),

    /** Kısa tanımlayıcı (ör. `KG`, `PCS`, `M2`). */
    code: text("code").notNull(),

    name: text("name").notNull(),

    dimension: unitDimension("dimension").notNull(),

    /** Miktarın kaç ondalık basamakla gösterileceği. */
    decimalPlaces: integer("decimal_places").notNull().default(0),

    /**
     * 1 birim bu = conversionFactor × taban birim.
     *
     * `null` bu birimin boyutun taban birimi olduğu anlamına gelir.
     */
    conversionFactor: numeric("conversion_factor", { precision: 18, scale: 6, mode: "number" }),

    status: recordStatus("status").notNull().default("ACTIVE"),

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
    // Composite foreign key hedefi.
    unique("item_unit_organization_id_id_unique").on(table.organizationId, table.id),

    // Aynı organizasyonda aynı birim kodu iki kez kullanılamaz.
    uniqueIndex("item_unit_organization_id_code_uidx").on(table.organizationId, table.code),

    index("item_unit_organization_id_idx").on(table.organizationId),
    index("item_unit_dimension_idx").on(table.dimension),
    index("item_unit_archived_at_idx").on(table.archivedAt),
  ],
);
