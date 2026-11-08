import { z } from "zod";

export const bootstrapSchema = z
  .object({
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
