import { apiKey } from "@better-auth/api-key";
import { appConfig } from "@mqdms/config";
import { db } from "@mqdms/db";
import { invitationRole, memberRole } from "@mqdms/db/schema";
import * as schema from "@mqdms/db/schema";
import { authEnv } from "@mqdms/env/auth";
import { addJob } from "@mqdms/queue";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError } from "better-auth/api";
import { organization } from "better-auth/plugins";
import { and, eq } from "drizzle-orm";
import { getTrustedOrigins } from "./origins";
import { ac, roles } from "./permissions/statements";

export const auth = betterAuth({
  appName: appConfig.name,

  /*
   * Oturum cookie'si `auth.mqdms.com` üzerinde yazılır. İki web deploy
   * (auth ve app) aynı config, aynı secret ve aynı veritabanını paylaştığı
   * için `app.mqdms.com` da aynı oturumu okuyabilir.
   */
  baseURL: authEnv.BETTER_AUTH_URL,
  secret: authEnv.BETTER_AUTH_SECRET,

  /*
   * Tüketen uygulamaların origin'leri. better-auth `callbackURL` ve
   * `redirectTo` alanlarını bu listeye göre doğrular; listede olmayan bir
   * origin'e yönlendirme `INVALID_CALLBACK_URL` ile reddedilir.
   */
  trustedOrigins: getTrustedOrigins(),

  advanced: {
    /*
     * Oturum cookie'si iki subdomain arasında paylaşılır.
     *
     * Paylaşım yalnızca `AUTH_COOKIE_DOMAIN` tanımlıysa açılır. Alan adı
     * verilmediğinde better-auth kök domain'i `BETTER_AUTH_URL`'den türetir
     * (üretimde `auth.mqdms.com`, yerelde `localhost`); `Domain=localhost`
     * tarayıcılarca reddedildiği için yerelde cookie host'a özel yazılmalıdır.
     */
    crossSubDomainCookies: {
      enabled: Boolean(authEnv.AUTH_COOKIE_DOMAIN),
      ...(authEnv.AUTH_COOKIE_DOMAIN ? { domain: authEnv.AUTH_COOKIE_DOMAIN } : {}),
    },

    /*
     * Ortak cookie adı ön eki. İki deploy aynı cookie adını kullanmalıdır;
     * ön ek farklı olursa session paylaşılmaz.
     */
    cookiePrefix: "mqdms",

    /* Üretimde cookie'ler yalnızca HTTPS üzerinden gönderilir. */
    useSecureCookies: authEnv.BETTER_AUTH_URL.startsWith("https://"),

    defaultCookieAttributes: {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: authEnv.BETTER_AUTH_URL.startsWith("https://"),
    },
  },

  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),

  session: {
    /* Oturum 7 gün geçerli; her gün bir kez uzatılır. */
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,

    /*
     * Cookie cache ilk sürümde kapalı: izin her istekte veritabanından
     * okunur. Cookie cache açıkken bir üyenin yetkisi düşürüldüğü anda
     * karar eski kalabilir.
     */
    cookieCache: {
      enabled: false,
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
     * Genel kayıt kapalı: `/register` sayfası ve `/sign-up/email` endpoint'i
     * kullanılamaz. Hesaplar yalnızca iki yoldan oluşur:
     *
     * 1. İlk kurulum — `/bootstrap-org` ekranı; owner hesabı ve organizasyon
     *    sunucu tarafında oluşturulur.
     * 2. Davet — `features/organization/invitation-registration.ts` sunucu
     *    aksiyonu; davet bağlantısı geçerliyse davet edilen e-posta adresiyle
     *    hesap açar.
     *
     * Kayıt olmayan kullanıcı hiçbir organizasyona kendiliğinden giremez:
     * `allowUserToCreateOrganization` kapalı, üyelik yalnızca davetle mümkün.
     */
    disableSignUp: true,

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
    organization({
      ac,
      roles,

      /*
       * Organizasyonu yalnızca bootstrap yolu açabilir; public endpoint kapalıdır.
       *
       * Bootstrap sunucu aksiyonu (`features/bootstrap/service.ts`) bu
       * endpoint'i `userId` vererek "system action" olarak çağırır ve oturum
       * taşımaz. Normal kullanıcı için endpoint tamamen kapalı kalır.
       */
      allowUserToCreateOrganization: false,
      requireEmailVerificationOnInvitation: true,

      /*
       * Rol kataloğu better-auth tarafından doğrulanmaz: "owner" da geçerli bir
       * better-auth rolüdür. Bu hook olmadan bir organizasyon üyesi ham API'yi
       * çağırarak kendisini (ya da başka bir üyeyi) "owner" yapabilirdi.
       *
       * Owner yalnızca organizasyonu açan bootstrap sırasında verilir; geri
       * kalan roller katalogdan seçilir.
       */
      organizationHooks: {
        beforeUpdateMemberRole: async ({ newRole }) => {
          const roles = newRole
            .split(",")
            .map((role) => role.trim())
            .filter(Boolean);

          const invalid = roles.filter((role) => role !== "member");

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

          const invalid = roles.filter((role) => role !== "member");

          if (invalid.length > 0) {
            throw new APIError("FORBIDDEN", {
              code: "ROLE_NOT_ASSIGNABLE",
              message: `These roles cannot be assigned: ${invalid.join(", ")}`,
            });
          }
        },

        /*
         * Davet kabul edildiğinde, davete atanmış fonksiyonel roller üyeye
         * verilir. Rol id'leri sunucu tarafında (`invitation_role` tablosu)
         * saklanır; istemci rol seçemez.
         *
         * Hook, better-auth'ın üyelik transaction'ı tamamlandıktan **sonra**
         * çağrılır; bu yüzden doğrudan veritabanına yazmak güvenlidir.
         */
        afterAcceptInvitation: async ({ invitation, member }) => {
          const assignments = await db
            .select({ roleId: invitationRole.roleId })
            .from(invitationRole)
            .where(
              and(
                eq(invitationRole.organizationId, invitation.organizationId),
                eq(invitationRole.invitationId, invitation.id),
              ),
            );

          if (assignments.length === 0) {
            return;
          }

          await db
            .insert(memberRole)
            .values(
              assignments.map((assignment) => ({
                organizationId: invitation.organizationId,
                memberId: member.id,
                roleId: assignment.roleId,
              })),
            )
            .onConflictDoNothing({
              target: [memberRole.memberId, memberRole.roleId],
            });
        },
      },

      async sendInvitationEmail(data) {
        const url = new URL("/accept-invitation", authEnv.BETTER_AUTH_URL);

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
