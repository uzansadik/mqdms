import { isResourceActionKey, type ResourceKey, resourceKeys, resources } from "./resources";
import {
  type Capability,
  getRoleOrganizationStatements,
  type ManagementRoleId,
  type OrganizationAction,
  organizationActions,
  parseRoles,
} from "./roles";

export type PermissionEffect = "allow" | "deny";

/**
 * Organizasyon bazlı, üye bazlı yetki kaydı.
 *
 * Grant'ler rolün kendi yetkisini *değiştirmez*, üzerine yazar:
 * açık bir `deny` her şeyi reddeder, açık bir `allow` role üstün çıkar.
 */
export type PermissionGrant = {
  resource: string;
  action: string;
  effect: PermissionEffect;

  /** Grant'in ait olduğu üye. Organizasyon genelinde listelendiğinde bulunur. */
  memberId?: string;
};

/**
 * Rol kaynaklı izin (`organization_role_permission` satırı).
 *
 * Bir üyenin rol izinleri, o üyeye atanmış tüm fonksiyonel rollerin izin
 * birleşimidir.
 */
export type RoleGrant = {
  resource: string;
  action: string;
};

/** Yetki değerlendirmesinin girdileri. */
export type PermissionEvaluationInput = {
  /** Üye `owner` mı? Owner her kayıtlı iş aksiyonuna erişir. */
  isOwner: boolean;

  /** Üye bazlı açık grant'ler. */
  grants: readonly PermissionGrant[];

  /** Üyeye atanmış rollerin birleşik izinleri. */
  roleGrants: readonly RoleGrant[];
};

/** Yetki matrisinde bir hücrenin durumu. */
export type PermissionState = PermissionEffect | "inherit";

export type RoleInput = string | string[] | null | undefined;

/** Yönetim rolleri ve yetenekleri (değerlendirme için düz harita). */
const managementCapabilities: Record<ManagementRoleId, readonly Capability[]> = {
  owner: ["managePermissions"],
  member: [],
};

/**
 * Kaynak/aksiyon çifti katalogda var mı?
 *
 * Katalog dışı bir çift **fail closed** sayılır: bilinmeyen bir yetki
 * verilmez. `isResourceActionKey` prototype anahtarlarına karşı
 * `Object.hasOwn` kontrolü yapar.
 */
export function isKnownResourceAction(resource: string, action: string): boolean {
  return isResourceActionKey(`${resource}:${action}`);
}

/**
 * Nihai yetki kararı.
 *
 * Öncelik sırası:
 * 1. Katalog dışı kaynak/aksiyon → reddet (fail closed).
 * 2. Owner → izin ver (owner'ın yetkisi değiştirilemez).
 * 3. Açık `deny` grant'i varsa reddet.
 * 4. Açık `allow` grant'i varsa izin ver.
 * 5. Yoksa üyeye atanmış rollerin birleşimine düş.
 * 6. Rol de vermiyorsa reddet (yeni üyenin varsayılanı boştur).
 */
export function evaluatePermission(
  input: PermissionEvaluationInput,
  resource: string,
  action: string,
): boolean {
  if (!isKnownResourceAction(resource, action)) {
    return false;
  }

  if (input.isOwner) {
    return true;
  }

  const matching = input.grants.filter(
    (grant) => grant.resource === resource && grant.action === action,
  );

  if (matching.some((grant) => grant.effect === "deny")) {
    return false;
  }

  if (matching.some((grant) => grant.effect === "allow")) {
    return true;
  }

  return input.roleGrants.some((grant) => grant.resource === resource && grant.action === action);
}

/**
 * Matris hücresinin durumu: grant varsa grant, yoksa `inherit`.
 *
 * `evaluatePermission` ile aynı öncelik uygulanır: birden fazla grant varsa
 * `deny` `allow`'dan baskındır.
 */
export function getPermissionState({
  grants,
  resource,
  action,
}: {
  grants: readonly PermissionGrant[];
  resource: string;
  action: string;
}): PermissionState {
  const matching = grants.filter((grant) => grant.resource === resource && grant.action === action);

  if (matching.some((grant) => grant.effect === "deny")) {
    return "deny";
  }

  if (matching.some((grant) => grant.effect === "allow")) {
    return "allow";
  }

  return "inherit";
}

/**
 * Üyenin tüm kaynak/aksiyon çiftleri için nihai yetki durumu.
 * Yetki matrisi arayüzü bunu kullanır.
 */
export function getEffectivePermissions(
  input: PermissionEvaluationInput,
): Record<string, Record<string, boolean>> {
  const result: Record<string, Record<string, boolean>> = {};

  for (const resource of resourceKeys) {
    const actions: Record<string, boolean> = {};

    for (const action of resources[resource].actions) {
      actions[action] = evaluatePermission(input, resource, action);
    }

    result[resource] = actions;
  }

  return result;
}

/** Üyenin izin listesi (`resource:action` biçiminde). */
export function getEffectivePermissionList(input: PermissionEvaluationInput): string[] {
  const permissions: string[] = [];

  for (const resource of resourceKeys) {
    for (const action of resources[resource].actions) {
      if (evaluatePermission(input, resource, action)) {
        permissions.push(`${resource}:${action}`);
      }
    }
  }

  return permissions;
}

/** Kaynağa ait grant'ler. */
export function getGrantsForResource(
  grants: readonly PermissionGrant[],
  resource: string,
): PermissionGrant[] {
  return grants.filter((grant) => grant.resource === resource);
}

/** Rolün platform capability'si (ör. `managePermissions`). */
export function hasCapability({
  role,
  capability,
}: {
  role: RoleInput;
  capability: Capability;
}): boolean {
  return parseRoles(role).some((roleId) => {
    const capabilities: readonly Capability[] =
      managementCapabilities[roleId as ManagementRoleId] ?? [];

    return capabilities.includes(capability);
  });
}

/**
 * Rolün organizasyon yönetimi aksiyonu var mı? (ör. `inviteMember`)
 *
 * Uygulama katmanının kullandığı ad, better-auth'in kontrol ettiği statement'a
 * eşlenir; böylece iki katman aynı rolden beslenip aynı kararı verir.
 */
export function hasOrganizationStatement({
  role,
  statement,
}: {
  role: RoleInput;
  statement: OrganizationAction;
}): boolean {
  const target = organizationActions[statement];

  return parseRoles(role).some((roleId) => {
    const allowed: readonly string[] = getRoleOrganizationStatements(roleId)[target.resource];

    return allowed.includes(target.action);
  });
}

/** Üyenin yönetim rollerinin birleşimi. */
export function getMemberRoleIds(role: RoleInput): ManagementRoleId[] {
  return parseRoles(role);
}

/** Bir kaynağın katalogdaki aksiyonları. */
export function getActionsForResource(resource: ResourceKey): readonly string[] {
  return resources[resource].actions;
}
