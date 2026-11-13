import { relations, sql } from "drizzle-orm";
import {
  boolean,
  date,
  foreignKey,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { customer, customerSite } from "../crm/customer";
import { member, organization, user } from "../initial/auth";
import { plant } from "../organization/plant";

/**
 * Proje durumu.
 *
 * Arşiv durumu (`archived_at`) status'tan ayrı bir kavramdır: `COMPLETED`
 * bir proje arşivlenmeden de görüntülenebilir.
 */
export const projectStatus = pgEnum("project_status", [
  "DRAFT",
  "ACTIVE",
  "ON_HOLD",
  "COMPLETED",
  "CANCELLED",
]);

/**
 * Proje ekibindeki üyenin proje içi rolü.
 *
 * Bu rol merkezi kimlik doğrulama permission rolünden **bağımsızdır**: bir
 * üyeyi proje müdürü yapmak yeni bir auth permission vermez.
 */
export const projectRole = pgEnum("project_role", [
  "PROJECT_MANAGER",
  "PROJECT_ENGINEER",
  "QUALITY_MANAGER",
  "QUALITY_ENGINEER",
  "PROCESS_ENGINEER",
  "PRODUCTION_RESPONSIBLE",
  "OTHER",
]);

/**
 * Müşteriye ait üretim veya ürün geliştirme projesi.
 *
 * Örnek: Alstom / Salzgitter / "S-Bahn Rheinland Driver Desk".
 */
export const project = pgTable(
  "project",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),

    /** Projenin müşterisi; zorunludur. */
    customerId: uuid("customer_id").notNull(),

    /** Müşterinin belirli bir tesisi; opsiyoneldir. */
    customerSiteId: uuid("customer_site_id"),

    /** Kısa tanımlayıcı; organizasyon içinde unique. */
    code: text("code").notNull(),

    name: text("name").notNull(),

    /** Müşterinin kendi proje kodu; mQDMS koduyla bağımsızdır. */
    customerProjectCode: text("customer_project_code"),

    description: text("description"),

    status: projectStatus("status").notNull().default("DRAFT"),

    /**
     * Proje müdürü olan organizasyon üyesi.
     *
     * Referans composite yabancı anahtardır: proje müdürü projenin
     * organizasyonuna ait olmak zorundadır, aksi halde başka bir
     * organizasyonun üyesi proje müdürü olamaz.
     *
     * Silme davranışı `no action`'dır: bir üye proje müdürüyken üye kaydı
     * doğrudan silinemez. Üye organizasyondan çıkarılırken referans önce
     * temizlenir (bkz. `removeMemberAction`).
     */
    projectManagerMemberId: text("project_manager_member_id"),

    startDate: date("start_date"),

    targetCompletionDate: date("target_completion_date"),

    actualCompletionDate: date("actual_completion_date"),

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

    /** Arşivlenme zamanı; fiziksel silme değildir. */
    archivedAt: timestamp("archived_at", { withTimezone: true }),
  },
  (table) => [
    /*
     * Composite unique: `project_plant` ve `project_member` tablolarının
     * (organization_id, project_id) yabancı anahtarını destekler.
     *
     * `unique` constraint olarak tanımlanır, `uniqueIndex` olarak değil:
     * PostgreSQL bir yabancı anahtar hedefi olarak yalnızca *constraint*
     * kabul eder ve Drizzle index'leri FK'lerden sonra oluşturur.
     */
    unique("project_organization_id_id_unique").on(table.organizationId, table.id),

    // Aynı organizasyonda aynı proje kodu olamaz.
    unique("project_organization_id_code_unique").on(table.organizationId, table.code),

    /*
     * Proje ve müşteri aynı organizasyona ait olmak zorundadır.
     */
    foreignKey({
      columns: [table.organizationId, table.customerId],
      foreignColumns: [customer.organizationId, customer.id],
      name: "project_customer_org_fk",
    }).onDelete("cascade"),

    /*
     * Site seçilmişse site, projenin müşterisine ait olmak zorundadır.
     * `customer_site_id` boşsa kısıt sağlanmaz.
     */
    foreignKey({
      columns: [table.customerId, table.customerSiteId],
      foreignColumns: [customerSite.customerId, customerSite.id],
      name: "project_site_customer_fk",
    }).onDelete("cascade"),

    /*
     * Proje müdürü, projenin organizasyonuna ait bir üye olmak zorundadır.
     *
     * Composite FK olduğu için başka bir organizasyonun üye id'si proje
     * müdürü olarak yazılamaz. `project_manager_member_id` boşsa kısıt
     * sağlanmaz (proje müdürü atanmamış olabilir).
     */
    foreignKey({
      columns: [table.organizationId, table.projectManagerMemberId],
      foreignColumns: [member.organizationId, member.id],
      name: "project_manager_member_org_fk",
    }),

    index("project_organization_id_idx").on(table.organizationId),
    index("project_customer_id_idx").on(table.customerId),
    index("project_status_idx").on(table.status),
    index("project_archived_at_idx").on(table.archivedAt),
  ],
);

/**
 * Projenin yürütüldüğü üretim tesisi.
 *
 * Bir proje bir veya birden fazla plant ile ilişkilendirilebilir; en fazla bir
 * primary plant'ı olabilir.
 */
export const projectPlant = pgTable(
  "project_plant",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),

    projectId: uuid("project_id").notNull(),

    plantId: uuid("plant_id").notNull(),

    /** Projenin ana üretim tesisi. */
    isPrimary: boolean("is_primary").notNull().default(false),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    // Aynı plant aynı projeye iki kez eklenemez.
    unique("project_plant_project_id_plant_id_unique").on(table.projectId, table.plantId),

    /*
     * Bir projenin en fazla bir primary plant'ı olabilir. Kısmi (partial)
     * unique index bunu veritabanı seviyesinde garanti eder.
     */
    uniqueIndex("project_plant_project_id_primary_uidx")
      .on(table.projectId)
      .where(sql`${table.isPrimary}`),

    /*
     * Proje ve plant aynı organizasyona ait olmak zorundadır.
     */
    foreignKey({
      columns: [table.organizationId, table.projectId],
      foreignColumns: [project.organizationId, project.id],
      name: "project_plant_project_org_fk",
    }).onDelete("cascade"),

    foreignKey({
      columns: [table.organizationId, table.plantId],
      foreignColumns: [plant.organizationId, plant.id],
      name: "project_plant_plant_org_fk",
    }).onDelete("cascade"),

    index("project_plant_organization_id_idx").on(table.organizationId),
    index("project_plant_project_id_idx").on(table.projectId),
    index("project_plant_plant_id_idx").on(table.plantId),
  ],
);

/**
 * Proje ekibindeki organizasyon üyesi.
 *
 * Üye projeden ayrıldığında `removed_at` set edilerek ilişki soft-remove
 * edilir: kayıt korunur ve üye yeniden eklenebilir.
 *
 * Üye **organizasyondan** ayrılırsa member satırı silinir ve aşağıdaki
 * composite foreign key zinciri onunla birlikte proje kayıtlarını da siler;
 * proje ekibi geçmişi o durumda yalnızca audit log'da kalır. Bu, organizasyon
 * izolasyonunun veritabanı seviyesinde garanti edilmesi için bilinçli bir
 * tercihtir.
 */
export const projectMember = pgTable(
  "project_member",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),

    projectId: uuid("project_id").notNull(),

    /** Organizasyon üyesinin better-auth member id'si. */
    memberId: text("member_id").notNull(),

    projectRole: projectRole("project_role").notNull().default("OTHER"),

    /** Proje içindeki görev tanımı. */
    responsibility: text("responsibility"),

    joinedAt: timestamp("joined_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),

    /** Projeden ayrılma zamanı; boşsa üye aktif. */
    removedAt: timestamp("removed_at", { withTimezone: true }),
  },
  (table) => [
    unique("project_member_organization_id_id_unique").on(table.organizationId, table.id),

    /*
     * Aynı **aktif** üye aynı projeye tekrar eklenemez. Ayrıldıktan sonra
     * yeniden eklenebilmesi için kısmi (partial) unique index kullanılır.
     */
    uniqueIndex("project_member_project_id_member_id_uidx")
      .on(table.projectId, table.memberId)
      .where(sql`${table.removedAt} is null`),

    /*
     * Proje ve üye aynı organizasyona ait olmak zorundadır.
     */
    foreignKey({
      columns: [table.organizationId, table.projectId],
      foreignColumns: [project.organizationId, project.id],
      name: "project_member_project_org_fk",
    }).onDelete("cascade"),

    foreignKey({
      columns: [table.organizationId, table.memberId],
      foreignColumns: [member.organizationId, member.id],
      name: "project_member_member_org_fk",
    }).onDelete("cascade"),

    index("project_member_organization_id_idx").on(table.organizationId),
    index("project_member_project_id_idx").on(table.projectId),
    index("project_member_member_id_idx").on(table.memberId),
  ],
);

export const projectRelations = relations(project, ({ one, many }) => ({
  customer: one(customer, {
    fields: [project.customerId],
    references: [customer.id],
  }),
  customerSite: one(customerSite, {
    fields: [project.customerSiteId],
    references: [customerSite.id],
  }),
  projectManager: one(member, {
    fields: [project.projectManagerMemberId],
    references: [member.id],
  }),
  plants: many(projectPlant),
  members: many(projectMember),
}));

export const projectPlantRelations = relations(projectPlant, ({ one }) => ({
  project: one(project, {
    fields: [projectPlant.projectId],
    references: [project.id],
  }),
  plant: one(plant, {
    fields: [projectPlant.plantId],
    references: [plant.id],
  }),
}));

export const projectMemberRelations = relations(projectMember, ({ one }) => ({
  project: one(project, {
    fields: [projectMember.projectId],
    references: [project.id],
  }),
  member: one(member, {
    fields: [projectMember.memberId],
    references: [member.id],
  }),
}));

/**
 * `plant` ile `project_plant` arasındaki ilişki burada tanımlanır.
 *
 * `organization/plant.ts` bu dosyayı içe aktardığı için bağlantı ters yönde
 * burada kurulur; aksi halde modüller arasında döngüsel import oluşur.
 */
export const plantRelations = relations(plant, ({ many }) => ({
  projectPlants: many(projectPlant),
}));
