import { apiKey } from "@better-auth/api-key";
import { appConfig } from "@mqdms/config";
import { db } from "@mqdms/db";
import * as schema from "@mqdms/db/schema";
import { env } from "@mqdms/env/server";
import { addJob } from "@mqdms/queue";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError } from "better-auth/api";
import { admin, organization } from "better-auth/plugins";
import { platformAc, platformRoles } from "./permissions/platform";
import { isAssignableRoleId } from "./permissions/roles";
import { ac, roles } from "./permissions/statements";

export const auth = betterAuth({
  appName: appConfig.name,

  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,

  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),

  session: {
    maxAge: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // 1 day
    cookieCache: {
      enabled: true,
      maxAge: 1 * 60, // 5 minutes
    },
  },

  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: true,
    autoSignInAfterVerification: true,

    sendVerificationEmail: async ({ user, url }) => {
      await addJob("email.verification", {
        to: user.email,
        verificationUrl: url,
      }).catch(console.error);
    },
  },

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,

    /*
     * Kayıt açık: davet edilen kişinin hesabı olmayabilir, davet e-postasındaki
     * bağlantıdan kayıt olup daveti kabul edebilmelidir.
     *
     * Güvenlik sınırı organizasyon açmaktır: `allowUserToCreateOrganization`
     * kapalı olduğu için kayıt olan kullanıcı hiçbir organizasyona kendiliğinden
     * giremez, yalnızca davetle üye olur.
     */
    disableSignUp: false,

    customSyntheticUser: ({ coreFields, additionalFields, id }) => ({
      ...coreFields,
      role: "user",
      banned: false,
      banReason: null,
      banExpires: null,
      ...additionalFields,
      id,
    }),

    sendResetPassword: async ({ user, url }) => {
      await addJob(
        "email.password-reset",
        {
          to: user.email,
          resetUrl: url,
        },
        { deduplication: { id: `password-reset-${user.id}`, ttl: 60 * 60 * 24 } },
      ).catch(console.error);
    },
  },

  plugins: [
    admin({
      defaultRole: "user",
      ac: platformAc,
      roles: platformRoles,
    }),

    organization({
      ac,
      roles,

      /*
       * Organizasyonu yalnızca superadmin açabilir; public endpoint kapalıdır.
       *
       * Superadmin'in sunucu aksiyonu (`features/admin/actions.ts`) bu endpoint'i
       * `userId` vererek "system action" olarak çağırır ve oturum taşımaz.
       * Normal kullanıcı için endpoint tamamen kapalı kalır.
       */
      allowUserToCreateOrganization: false,
      requireEmailVerificationOnInvitation: true,

      /*
       * Rol kataloğu better-auth tarafından doğrulanmaz: "owner" da geçerli bir
       * better-auth rolüdür. Bu hook olmadan bir organizasyon admin'i ham API'yi
       * çağırarak kendini (ya da başka bir üyeyi) "owner" yapabilirdi.
       *
       * "owner" yalnızca organizasyonu açan superadmin tarafından, oluşturma
       * anında verilir; geri kalan roller katalogdan seçilir.
       */
      organizationHooks: {
        beforeUpdateMemberRole: async ({ newRole }) => {
          const roles = newRole
            .split(",")
            .map((role) => role.trim())
            .filter(Boolean);

          const invalid = roles.filter((role) => !isAssignableRoleId(role));

          if (invalid.length > 0) {
            throw new APIError("FORBIDDEN", {
              code: "ROLE_NOT_ASSIGNABLE",
              message: `These roles cannot be assigned: ${invalid.join(", ")}`,
            });
          }
        },

        beforeCreateInvitation: async ({ invitation }) => {
          const roles = invitation.role
            .split(",")
            .map((role) => role.trim())
            .filter(Boolean);

          const invalid = roles.filter((role) => !isAssignableRoleId(role));

          if (invalid.length > 0) {
            throw new APIError("FORBIDDEN", {
              code: "ROLE_NOT_ASSIGNABLE",
              message: `These roles cannot be assigned: ${invalid.join(", ")}`,
            });
          }
        },
      },

      async sendInvitationEmail(data) {
        const url = new URL("/accept-invitation", env.BETTER_AUTH_URL);

        url.searchParams.set("id", data.id);

        await addJob("email.organization-invitation", {
          to: data.email,
          invitationUrl: url.toString(),
          organizationName: data.organization.name,
          inviterName: data.inviter.user.name,
        });
      },
    }),
    apiKey([
      {
        configId: "org-keys",
        references: "organization",
        defaultPrefix: "up_",
      },
    ]),
  ],
});
export type Session = typeof auth.$Infer.Session;
