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

  role: z.enum(["admin", "member"]),
});

export type InviteMemberValues = z.infer<typeof inviteMemberSchema>;

export type OrganizationSettingsValues = z.infer<typeof organizationSettingsSchema>;
