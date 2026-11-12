import { createAccessControl } from "better-auth/plugins/access";

import {
  betterAuthStatements,
  getCapabilityStatement,
  type Capability,
  type ManagementRoleDefinition,
  type ManagementRoleId,
  type OrganizationAction,
  organizationActions,
  managementRoleDefinitions,
} from "./roles";

/**
 * better-auth access control instance'ı.
 *
 * Kaynak listesi better-auth'in organization plugin'ıyla birebir aynıdır;
 * plugin'in `authorize()` çağrıları bu kaynak adlarını kullanır.
 */
export const ac = createAccessControl(betterAuthStatements);

/**
 * better-auth'e verilen yönetim rol tanımları.
 *
 * Rollerin yetkileri `managementRoleDefinitions` kataloğundan gelir; burada
 * yalnızca better-auth'in beklediği biçime çevrilir.
 *
 * Rol anahtarları `betterAuthStatements` ile eşleşmelidir: better-auth
 * `authorize()` çağrısında eksik kaynak anahtarını "bilinmeyen kaynak" sayıp
 * reddeder.
 */
export const roles = {
  owner: ac.newRole(managementRoleDefinitions.owner.organizationStatements),
  member: ac.newRole(managementRoleDefinitions.member.organizationStatements),
};

/**
 * Uygulama katmanı statement haritası: `statement -> statement'a sahip roller`.
 *
 * Bu harita better-auth'e verilmez; yönetim ekranının hangi rolün hangi
 * yetkiye sahip olduğunu göstermesi için kullanılır. better-auth'in kendi
 * statement kaynakları `managementRoleDefinitions` içinde ayrı tutulur.
 */
export type StatementMap = Record<string, ManagementRoleId[]>;

const roleEntries = Object.entries(managementRoleDefinitions) as [
  ManagementRoleId,
  ManagementRoleDefinition,
][];

function addRoleToStatement(map: StatementMap, statement: string, roleId: ManagementRoleId) {
  const existing = map[statement];

  if (existing) {
    existing.push(roleId);

    return;
  }

  map[statement] = [roleId];
}

/** Organizasyon yönetimi aksiyonları -> roller. */
function buildOrganizationActionMap(): StatementMap {
  const map: StatementMap = {};

  for (const [roleId, definition] of roleEntries) {
    for (const action of Object.keys(organizationActions) as OrganizationAction[]) {
      const target = organizationActions[action];
      const allowed = definition.organizationStatements[target.resource];

      if (allowed.includes(target.action)) {
        addRoleToStatement(map, action, roleId);
      }
    }
  }

  return map;
}

/** Platform capability statement'ları (`permission:manage` gibi) -> roller. */
function buildCapabilityStatementMap(): StatementMap {
  const map: StatementMap = {};

  for (const [roleId, definition] of roleEntries) {
    for (const capability of definition.capabilities) {
      addRoleToStatement(map, getCapabilityStatement(capability), roleId);
    }
  }

  return map;
}

/** Tüm statement'ların birleşik haritası. */
export const statementMap: StatementMap = {
  ...buildOrganizationActionMap(),
  ...buildCapabilityStatementMap(),
};

/** Bir rolün sahip olduğu statement'lar. */
export function getRoleStatements(roleId: ManagementRoleId): string[] {
  return Object.keys(statementMap).filter(
    (statement) => statementMap[statement]?.includes(roleId) ?? false,
  );
}

/** Bir capability'nin statement biçimi. */
export function getCapabilityStatementFor(capability: Capability) {
  return getCapabilityStatement(capability);
}
