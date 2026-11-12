import { z } from "zod";

/**
 * İlk kurulum formu.
 *
 * Tek ekran: organizasyon adı ve slug'ı, owner adı/e-posta/parolası ve
 * bootstrap anahtarı. Public signup değildir — hesap yalnızca bu ekrandan
 * açılır.
 */
export const bootstrapSchema = z
  .object({
    organizationName: z.string().trim().min(2).max(100),

    organizationSlug: z
      .string()
      .trim()
      .min(2)
      .max(63)
      .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        "Use lowercase letters, numbers, and hyphens only.",
      ),

    name: z.string().trim().min(2).max(100),

    email: z.email().trim().toLowerCase(),

    password: z.string().min(16).max(128),

    confirmPassword: z.string(),

    bootstrapKey: z.string().min(32),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type BootstrapValues = z.infer<typeof bootstrapSchema>;
