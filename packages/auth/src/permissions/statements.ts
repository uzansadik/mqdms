import { createAccessControl } from "better-auth/plugins/access";

import { resourceKeys } from "./resources";
import {
  betterAuthStatements,
  getCapabilityStatement,
  type OrganizationAction,
  organizationActions,
  type RoleDefinition,
  type RoleId,
  roleDefinitions,
} from "./roles";

/**
 * better-auth access control instance'ı.
 *
 * Kaynak listesi better-auth'in organization plugin'ıyla birebir aynıdır;
 * plugin'in `authorize()` çağrıları bu kaynak adlarını kullanır.
 */
export const ac = createAccessControl(betterAuthStatements);

/**
 * better-auth'e verilen rol tanımları.
 *
 * Rollerin yetkileri `roleDefinitions` kataloğundan gelir; burada yalnızca
 * better-auth'in beklediği biçime çevrilir.
 *
 * Rol anahtarları `betterAuthStatements` ile eşleşmelidir: better-auth
 * `authorize()` çağrısında eksik kaynak anahtarını "bilinmeyen kaynak" sayıp
 * reddeder.
 */
export const roles = {
  owner: ac.newRole(roleDefinitions.owner.organizationStatements),
  admin: ac.newRole(roleDefinitions.admin.organizationStatements),
  member: ac.newRole(roleDefinitions.member.organizationStatements),
  "project-engineer": ac.newRole(roleDefinitions["project-engineer"].organizationStatements),
  "quality-engineer": ac.newRole(roleDefinitions["quality-engineer"].organizationStatements),
};

/**
 * Uygulama katmanı statement haritası: `statement -> statement'a sahip roller`.
 *
 * Bu harita better-auth'e verilmez; yetki matrisinin ve panelin hangi rolün
 * hangi yetkiye sahip olduğunu göstermek için kullanılır. better-auth'in
 * kendi statement kaynakları `roleDefinitions` içinde ayrı tutulur.
 */
export type StatementMap = Record<string, RoleId[]>;

const roleEntries = Object.entries(roleDefinitions) as [RoleId, RoleDefinition][];

function addRoleToStatement(map: StatementMap, statement: string, roleId: RoleId) {
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

/** Kaynak statement'ları (`fmea:approve` gibi) -> roller. */
function buildResourceStatementMap(): StatementMap {
  const map: StatementMap = {};

  for (const [roleId, definition] of roleEntries) {
    for (const [resource, actions] of Object.entries(definition.permissions)) {
      if (!actions) {
        continue;
      }

      for (const action of actions) {
        addRoleToStatement(map, `${resource}:${action}`, roleId);
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
  ...buildResourceStatementMap(),
  ...buildCapabilityStatementMap(),
};

/** Bir rolün sahip olduğu statement'lar. */
export function getRoleStatements(roleId: RoleId): string[] {
  return Object.keys(statementMap).filter(
    (statement) => statementMap[statement]?.includes(roleId) ?? false,
  );
}

/** Kaynak bazlı statement'lar (`fmea:approve` gibi). */
export function getResourceStatements(): string[] {
  return Object.keys(statementMap).filter((statement) =>
    resourceKeys.some((resource) => statement.startsWith(`${resource}:`)),
  );
}
