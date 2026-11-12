import { z } from "zod";

export const organizationSettingsSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Organization name is required.")
    .max(100, "Organization name is too long."),

  slug: z
    .string()
    .trim()
    .min(1, "Slug is required.")
    .max(100, "Slug is too long.")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug can only contain lowercase letters, numbers, and hyphens.",
    ),
});

export const createOrganizationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Organization name must be at least 2 characters.")
    .max(100, "Organization name must be at most 100 characters."),

  slug: z
    .string()
    .trim()
    .min(2, "Slug must be at least 2 characters.")
    .max(63, "Slug must be at most 63 characters.")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens only."),
});

export type CreateOrganizationValues = z.infer<typeof createOrganizationSchema>;

export const inviteMemberSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),

  /*
   * Fonksiyonel roller organizasyona özel kayıtlardır; id'leri sunucu
   * tarafında saklanır ve sunucu tarafından doğrulanır. Boş bırakılabilir:
   * yeni üye varsayılan olarak hiçbir iş yetkisine sahip olmaz.
   */
  roleIds: z.array(z.string().trim().min(1)).max(20),
});

export type InviteMemberValues = z.infer<typeof inviteMemberSchema>;

/** Davet bağlantısıyla hesap açma formu. */
export const invitationRegistrationSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Name must be at least 2 characters.")
      .max(100, "Name must be at most 100 characters."),

    password: z
      .string()
      .min(8, "Password must be at least 8 characters.")
      .max(128, "Password must be at most 128 characters."),

    confirmPassword: z.string(),
  })
  .refine(({ password, confirmPassword }) => password === confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export type InvitationRegistrationValues = z.infer<typeof invitationRegistrationSchema>;

export type OrganizationSettingsValues = z.infer<typeof organizationSettingsSchema>;
