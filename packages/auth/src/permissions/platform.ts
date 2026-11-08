
import { createAccessControl } from "better-auth/plugins/access";

import {
  defaultStatements,
  adminAc,
} from "better-auth/plugins/admin/access";

export const platformAc = createAccessControl(
  defaultStatements
);

export const platformRoles = {
  user: platformAc.newRole({}),

  // Şimdilik normal platform admin yetkisiz.
  // Tüm yönetim superadmin üzerinden yapılacak.
  admin: platformAc.newRole({}),

  superadmin: platformAc.newRole({
    ...adminAc.statements,
  }),
};

export type PlatformRole =
  keyof typeof platformRoles;
