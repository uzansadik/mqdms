import "server-only";

import { auth } from "./server";

/**
 * Sunucu tarafı hesap oluşturma.
 *
 * Genel kayıt kapalıdır (`emailAndPassword.disableSignUp`); hesaplar yalnızca
 * iki yoldan oluşur:
 *
 * 1. İlk kurulum — `/bootstrap-org` ekranı.
 * 2. Davet — davet bağlantısı.
 *
 * Bu modül her iki yolun da kullandığı, **yalnızca sunucuda** çalışan tek
 * yardımcıdır. Parola better-auth'ın kendi hash fonksiyonuyla saklanır;
 * credential hesabı better-auth'ın `internalAdapter` sözleşmesine göre
 * oluşturulur (tabloya doğrudan insert yapılmaz).
 */

export type ProvisionedUser = {
  id: string;
  email: string;
  name: string;
};

export class UserAlreadyExistsError extends Error {
  constructor() {
    super("A user with this e-mail address already exists.");
    this.name = "UserAlreadyExistsError";
  }
}

/**
 * Parolalı bir kullanıcı oluşturur.
 *
 * `emailVerified` varsayılan olarak `false`'tir: e-posta doğrulaması normal
 * akışta (davet linki veya doğrulama e-postası) yapılır.
 */
export async function provisionUserWithPassword(input: {
  email: string;
  name: string;
  password: string;
  emailVerified?: boolean;
}): Promise<ProvisionedUser> {
  const email = input.email.trim().toLowerCase();

  const context = await auth.$context;

  const existing = await context.internalAdapter.findUserByEmail(email);

  if (existing?.user) {
    throw new UserAlreadyExistsError();
  }

  const hashedPassword = await context.password.hash(input.password);

  const user = await context.internalAdapter.createUser(
    {
      email,
      name: input.name,
      emailVerified: input.emailVerified ?? false,
    },
    { method: "email-password" },
  );

  await context.internalAdapter.linkAccount({
    userId: user.id,
    providerId: "credential",
    accountId: user.id,
    password: hashedPassword,
  });

  return {
    id: user.id,
    email: user.email,
    name: user.name,
  };
}

/**
 * E-posta adresine göre kullanıcı arar.
 *
 * Bootstrap'un kurtarma (recovery) akışında kullanılır: yarım kalan bir
 * kurulumda owner hesabı zaten oluşmuş olabilir.
 */
export async function findUserByEmail(email: string): Promise<ProvisionedUser | null> {
  const context = await auth.$context;

  const existing = await context.internalAdapter.findUserByEmail(email.trim().toLowerCase());

  if (!existing?.user) {
    return null;
  }

  return {
    id: existing.user.id,
    email: existing.user.email,
    name: existing.user.name,
  };
}
