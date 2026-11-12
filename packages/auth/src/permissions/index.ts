/**
 * Tarayıcı güvenli izin dışa aktarımları.
 *
 * Bu modül veritabanına, ortam secret'larına veya Node'a özgü modüllere
 * bağımlı **değildir**; client bileşenlerince de import edilebilir.
 *
 * Veritabanı erişimi gerektiren servisler `../permissions/server`
 * altında ayrı bir giriş noktasından sunulur.
 */
export {
  evaluatePermission,
  getActionsForResource,
  getEffectivePermissionList,
  getEffectivePermissions,
  getGrantsForResource,
  getMemberRoleIds,
  getPermissionState,
  hasCapability,
  hasOrganizationStatement,
  isKnownResourceAction,
  type PermissionEffect,
  type PermissionEvaluationInput,
  type PermissionGrant,
  type PermissionState,
  type RoleGrant,
  type RoleInput,
} from "./evaluate";
export {
  getAllResourceActionKeys,
  getResourceActions,
  getResourceLabel,
  isResourceActionKey,
  isResourceKey,
  type ResourceAction,
  type ResourceActionKey,
  type ResourceKey,
  resourceKeys,
  resources,
} from "./resources";
export {
  assignableManagementRoleIds,
  type BetterAuthStatementResource,
  betterAuthStatements,
  type Capability,
  capabilities,
  getCapabilityStatement,
  getRoleOrganizationStatements,
  isAssignableManagementRoleId,
  isManagementRoleId,
  isOwnerRole,
  type ManagementRoleDefinition,
  type ManagementRoleId,
  managementRoleDefinitions,
  managementRoleIds,
  type OrganizationAction,
  type OrganizationRoleStatements,
  organizationActions,
  parseRoles,
} from "./roles";
export {
  ac,
  getCapabilityStatementFor,
  getRoleStatements,
  roles,
  type StatementMap,
  statementMap,
} from "./statements";
