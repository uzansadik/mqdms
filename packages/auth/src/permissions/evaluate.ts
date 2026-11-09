import {
  type Capability,
  getCapabilityStatement,
  getRoleOrganizationStatements,
  type OrganizationAction,
  organizationActions,
  parseRoles,
  type RoleId,
  roleDefinitions,
} from "./roles";

export type PermissionEffect = "allow" | "deny";

/**
 * Organizasyon bazlı yetki kaydı.
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

/** Yetki matrisinde bir hücrenin durumu. */
export type PermissionState = PermissionEffect | "inherit";

export type RoleInput = string | string[] | null | undefined;

/** Rolün kendi kataloğundan gelen kaynak yetkisi. */
export function hasRolePermission({
  role,
  resource,
  action,
}: {
  role: RoleInput;
  resource: string;
  action: string;
}): boolean {
  return parseRoles(role).some((roleId) => {
    /*
     * Katalog `as const` olduğu için aksiyon listeleri dar tiptir
     * (`readonly ["read"]`). Serbest metin karşılaştırması yapabilmek için
     * genişletilmiş bir görünüme alınır.
     */
    const permissions = roleDefinitions[roleId].permissions as unknown as Record<
      string,
      readonly string[] | undefined
    >;

    const actions = permissions[resource];

    return Boolean(actions?.includes(action));
  });
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
    const capabilities: readonly Capability[] = roleDefinitions[roleId].capabilities;

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

export function getCapabilityStatementFor(capability: Capability) {
  return getCapabilityStatement(capability);
}

/** Kaynağa ait grant'ler. */
export function getGrantsForResource(
  grants: readonly PermissionGrant[],
  resource: string,
): PermissionGrant[] {
  return grants.filter((grant) => grant.resource === resource);
}

/**
 * Nihai yetki kararı.
 *
 * Öncelik sırası:
 * 1. Açık `deny` grant'i varsa reddet.
 * 2. Açık `allow` grant'i varsa izin ver.
 * 3. Yoksa sabit rol kataloğuna düş.
 */
export function evaluatePermission({
  role,
  grants,
  resource,
  action,
}: {
  role: RoleInput;
  grants: readonly PermissionGrant[];
  resource: string;
  action: string;
}): boolean {
  const matching = grants.filter((grant) => grant.resource === resource && grant.action === action);

  if (matching.some((grant) => grant.effect === "deny")) {
    return false;
  }

  if (matching.some((grant) => grant.effect === "allow")) {
    return true;
  }

  return hasRolePermission({ role, resource, action });
}

/**
 * Matris hücresinin durumu: grant varsa grant, yoksa rolün kendi durumu.
 *
 * `evaluatePermission` ile aynı öncelik uygulanır: birden fazla grant
 * varsa `deny` `allow`'dan baskındır.
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
export function getEffectivePermissions({
  role,
  grants,
  resources,
}: {
  role: RoleInput;
  grants: readonly PermissionGrant[];
  resources: readonly { key: string; actions: readonly string[] }[];
}): Record<string, Record<string, boolean>> {
  const result: Record<string, Record<string, boolean>> = {};

  for (const resource of resources) {
    const actions: Record<string, boolean> = {};

    for (const action of resource.actions) {
      actions[action] = evaluatePermission({
        role,
        grants,
        resource: resource.key,
        action,
      });
    }

    result[resource.key] = actions;
  }

  return result;
}

/** Üyenin rollerinin birleşimi. */
export function getMemberRoleIds(role: RoleInput): RoleId[] {
  return parseRoles(role);
}
