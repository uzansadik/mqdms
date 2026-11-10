import { type ResourceKey, resourceKeys, resources } from "./resources";

/**
 * better-auth organization plugin'in kontrol ettiği statement kaynakları.
 *
 * Bu liste better-auth 1.7.1 kaynağından birebir alınmıştır
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
 * Platformun kendi capability'leri. Bunlar better-auth'e ait değildir;
 * uygulama katmanında `evaluate.ts` üzerinden değerlendirilir.
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
 * Bir rolün davranışsal tanımı.
 *
 * Katalog yalnızca *politikayı* taşır: hangi statement'lara, capability'lere ve
 * kaynak yetkilerine sahip olduğu. Kullanıcıya gösterilen metin (rol adı,
 * açıklaması) burada değil, uygulamanın i18n katmanında tutulur; böylece
 * katalog sunum dilinden bağımsız kalır.
 */
export type RoleDefinition = {
  /** better-auth organization plugin statement'ları. */
  organizationStatements: OrganizationRoleStatements;

  /** Platform capability'leri. */
  capabilities: readonly Capability[];

  /** MQDMS kaynak yetkileri: kaynak -> izinli aksiyonlar. */
  permissions: Partial<Record<ResourceKey, readonly string[]>>;
};

/**
 * Tüm kaynaklarda tüm aksiyonlar (owner/admin için).
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

/** Admin: owner'ın tümü, organizasyon silme hariç. */
const adminStatements = {
  ...ownerStatements,
  organization: ["update"],
} as const;

/** Kullanıcı rolleri: organizasyon yönetimi yok, yalnızca okuma. */
const memberStatements = {
  organization: [],
  member: [],
  invitation: [],
  team: [],
  ac: ["read"],
} as const;

/**
 * Sabit rol kataloğu.
 *
 * Roller kod içinde tanımlıdır ve çalışma zamanında değiştirilemez. MQDMS
 * alanı genişledikçe buraya yeni rol veya yeni kaynak eklenir.
 */
export const roleDefinitions = {
  owner: {
    organizationStatements: ownerStatements,
    capabilities: ["managePermissions"],
    permissions: allResourceActions(),
  },

  admin: {
    organizationStatements: adminStatements,
    capabilities: ["managePermissions"],
    permissions: allResourceActions(),
  },

  member: {
    organizationStatements: memberStatements,
    capabilities: [],
    permissions: {
      fmea: ["read"],
    },
  },

  "project-engineer": {
    organizationStatements: memberStatements,
    capabilities: [],
    permissions: {
      fmea: ["create", "read", "update", "save", "submit"],
    },
  },

  "quality-engineer": {
    organizationStatements: memberStatements,
    capabilities: [],
    permissions: {
      fmea: ["read", "approve", "reject"],
    },
  },
} as const satisfies Record<string, RoleDefinition>;

export const roleIds = Object.keys(roleDefinitions) as RoleId[];

export type RoleId = keyof typeof roleDefinitions;

/** Davet ve rol atama ekranlarında gösterilebilen roller. */
export const assignableRoleIds = roleIds.filter((roleId) => roleId !== "owner");

export function isRoleId(value: string): value is RoleId {
  return value in roleDefinitions;
}

/**
 * Bir rolün atanabilir olup olmadığı.
 *
 * "owner" katalogda var ama atanamaz: owner rolü yalnızca organizasyonu açan
 * superadmin tarafından, oluşturma anında verilir. Böylece bir organizasyonun
 * sahibi sonradan değiştirilemez ve admin'ler kendilerini owner yapamaz.
 */
export function isAssignableRoleId(value: string): value is RoleId {
  return isRoleId(value) && value !== "owner";
}

/**
 * Üye rolünü tekil listeye çevirir.
 *
 * better-auth birden fazla rolü virgülle ayrılmış olarak saklar
 * (`member.role`). Katalogda olmayan roller yetkisiz sayılır.
 */
export function parseRoles(role: string | string[] | null | undefined): RoleId[] {
  const raw = Array.isArray(role) ? role : (role ?? "").split(",");

  const parsed = raw.map((item) => item.trim());

  return parsed.filter((item): item is RoleId => isRoleId(item));
}

/** Bir rolün MQDMS kaynak yetkileri. */
export function getRolePermissions(
  roleId: RoleId,
): Partial<Record<ResourceKey, readonly string[]>> {
  return roleDefinitions[roleId].permissions;
}

/** Bir rolün better-auth statement haritası. */
export function getRoleOrganizationStatements(roleId: RoleId): OrganizationRoleStatements {
  return roleDefinitions[roleId].organizationStatements;
}
