import { apiKey } from "@better-auth/api-key";
import { appConfig } from "@mqdms/config";
import { db } from "@mqdms/db";
import * as schema from "@mqdms/db/schema";
import { env } from "@mqdms/env/server";
import { addJob } from "@mqdms/queue";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin, organization } from "better-auth/plugins";
import { platformAc, platformRoles } from "./permissions/platform";

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
    disableSignUp: true,

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
      allowUserToCreateOrganization: false,
      requireEmailVerificationOnInvitation: true,

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
