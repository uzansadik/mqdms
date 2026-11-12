import { type ResourceKey, resourceKeys, resources } from "./resources";

/**
 * better-auth organization plugin'in kontrol ettiği statement kaynakları.
 *
 * Bu liste better-auth 1.7.20 kaynağından birebir alınmıştır
 * (`better-auth/dist/plugins/organization/access/statement.mjs`). Plugin'in
 * endpoint'leri yetkiyi bu kaynak adları üzerinden kontrol eder; liste
 * değiştirilirse plugin ile senkron tutulmalıdır.
 */
export const betterAuthStatements = {
  organization: ["update", "delete"],
  member: ["create", "update", "delete"],
  invitation: ["create", "cancel"],
  team: ["create", "update", "delete"],
  ac: ["create", "read", "update", "delete"],
} as const;

export type BetterAuthStatementResource = keyof typeof betterAuthStatements;

/**
 * Organizasyon yönetimi aksiyonları ve better-auth statement eşlemesi.
 *
 * Uygulama katmanı bu adları kullanır (`inviteMember`), better-auth ise
 * eşdeğer statement'ı kendi endpoint'inde kontrol eder. İki katman da aynı
 * rolden beslendiği için kararları ayrışmaz.
 */
export const organizationActions = {
  updateOrganization: { resource: "organization", action: "update" },
  deleteOrganization: { resource: "organization", action: "delete" },
  inviteMember: { resource: "invitation", action: "create" },
  cancelInvitation: { resource: "invitation", action: "cancel" },
  updateMemberRole: { resource: "member", action: "update" },
  removeMember: { resource: "member", action: "delete" },
} as const satisfies Record<string, { resource: BetterAuthStatementResource; action: string }>;

export type OrganizationAction = keyof typeof organizationActions;

/**
 * Organizasyon yönetimi capability'leri.
 *
 * Bunlar better-auth'e ait değildir; uygulama katmanında `evaluate.ts`
 * üzerinden değerlendirilir.
 */
export const capabilities = ["managePermissions"] as const;

export type Capability = (typeof capabilities)[number];

/** `permission:manage` gibi capability statement'larının biçimi. */
export function getCapabilityStatement(capability: Capability) {
  return `permission:${capability}`;
}

/** Bir rolün better-auth statement haritası: kaynak → izinli aksiyonlar. */
export type OrganizationRoleStatements = {
  readonly [K in BetterAuthStatementResource]: readonly string[];
};

/**
 * Bir yönetim rolünün davranışsal tanımı.
 *
 * Katalog yalnızca *politikayı* taşır: hangi statement'lara ve capability'lere
 * sahip olduğu. Kullanıcıya gösterilen metin (rol adı, açıklama) burada
 * değil, uygulamanın i18n katmanında tutulur.
 *
 * Fonksiyonel roller (Fabrika Müdürü, Proje Mühendisi, ...) bu katalogda
 * **yoktur**: onlar organizasyona özel kayıtlardır (`organization_role`
 * tablosu) ve seed katalogundan üretilir.
 */
export type ManagementRoleDefinition = {
  /** better-auth organization plugin statement'ları. */
  organizationStatements: OrganizationRoleStatements;

  /** Yönetim capability'leri. */
  capabilities: readonly Capability[];
};

/**
 * Tüm kaynaklarda tüm aksiyonlar (owner için).
 *
 * `Object.fromEntries` yerine döngü kullanılıyor: `fromEntries` çıktısı
 * `Record<ResourceKey, ...>` olarak ancak zorlayıcı (as) dönüşümle
 * çevrilebiliyordu.
 */
function allResourceActions(): Record<ResourceKey, readonly string[]> {
  const actions = {} as Record<ResourceKey, readonly string[]>;

  for (const key of resourceKeys) {
    actions[key] = resources[key].actions;
  }

  return actions;
}

/** Owner: better-auth'in varsayılan owner rolüyle birebir aynı. */
const ownerStatements = {
  organization: ["update", "delete"],
  member: ["create", "update", "delete"],
  invitation: ["create", "cancel"],
  team: ["create", "update", "delete"],
  ac: ["create", "read", "update", "delete"],
} as const;

/** Kullanıcı rolleri: organizasyon yönetimi yok. */
const memberStatements = {
  organization: [],
  member: [],
  invitation: [],
  team: [],
  ac: ["read"],
} as const;

/**
 * Yönetim rol kataloğu.
 *
 * better-auth `member.role` alanı **yalnızca** bu iki rolü taşır:
 *
 * - `owner`: organizasyonun sahibi. Tüm kayıtlı iş aksiyonlarına erişir ve
 *   rol/üye/izin yönetimi yapar. Bu yetkiler member grant ile değiştirilemez.
 * - `member`: normal üye. İş yetkileri yalnızca atanmış fonksiyonel rollerden
 *   ve üye bazlı grant'lardan gelir; varsayılanı boştur.
 *
 * Roller kod içinde tanımlıdır ve çalışma zamanında değiştirilemez.
 */
export const managementRoleDefinitions = {
  owner: {
    organizationStatements: ownerStatements,
    capabilities: ["managePermissions"],
  },

  member: {
    organizationStatements: memberStatements,
    capabilities: [],
  },
} as const satisfies Record<string, ManagementRoleDefinition>;

export const managementRoleIds = Object.keys(managementRoleDefinitions) as ManagementRoleId[];

/** Davet ve rol atama ekranlarında gösterilebilen yönetim rolleri. */
export const assignableManagementRoleIds = managementRoleIds.filter(
  (roleId) => roleId !== "owner",
);

export type ManagementRoleId = keyof typeof managementRoleDefinitions;

/**
 * `owner` katalogda var ama atanamaz: owner rolü yalnızca organizasyonu açan
 * bootstrap sırasında verilir. Böylece bir organizasyonun sahibi sonradan
 * değiştirilemez ve üyeler kendilerini owner yapamaz.
 */
export function isAssignableManagementRoleId(value: string): value is ManagementRoleId {
  return isManagementRoleId(value) && value !== "owner";
}

export function isManagementRoleId(value: string): value is ManagementRoleId {
  return Object.hasOwn(managementRoleDefinitions, value);
}

/**
 * Üye rolünü tekil listeye çevirir.
 *
 * better-auth birden fazla rolü virgülle ayrılmış olarak saklar
 * (`member.role`). Katalogda olmayan roller yetkisiz sayılır.
 */
export function parseRoles(role: string | string[] | null | undefined): ManagementRoleId[] {
  const raw = Array.isArray(role) ? role : (role ?? "").split(",");

  const parsed = raw.map((item) => item.trim());

  return parsed.filter((item): item is ManagementRoleId => isManagementRoleId(item));
}

/** Üye `owner` mı? */
export function isOwnerRole(role: string | string[] | null | undefined): boolean {
  return parseRoles(role).includes("owner");
}

/** Bir rolün MQDMS kaynak yetkileri (owner tüm kaynaklara erişir). */
export function getOwnerResourceActions(): Record<ResourceKey, readonly string[]> {
  return allResourceActions();
}

/** Bir rolün better-auth statement haritası. */
export function getRoleOrganizationStatements(
  roleId: ManagementRoleId,
): OrganizationRoleStatements {
  return managementRoleDefinitions[roleId].organizationStatements;
}
