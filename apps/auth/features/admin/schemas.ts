import { z } from "zod";

export const createOrganizationByAdminSchema = z.object({
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

  owner: z.object({
    email: z.string().trim().toLowerCase().email("Enter a valid email address."),

    name: z
      .string()
      .trim()
      .min(2, "Name must be at least 2 characters.")
      .max(100, "Name must be at most 100 characters.")
      .optional(),

    role: z.enum(["owner", "admin"]),
  }),
});

export type CreateOrganizationByAdminValues = z.infer<typeof createOrganizationByAdminSchema>;
