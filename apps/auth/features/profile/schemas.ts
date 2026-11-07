import { z } from "zod";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

export const profileSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters.").max(100),

  avatar: z
    .custom<File>(
      (value) => typeof File !== "undefined" && value instanceof File,
      "Select a valid image.",
    )
    .refine((file) => IMAGE_TYPES.includes(file.type), "Use JPEG, PNG or WebP.")
    .refine((file) => file.size <= MAX_IMAGE_SIZE, "Image must be smaller than 5 MB.")
    .optional(),
});

export type ProfileValues = z.infer<typeof profileSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required."),

    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters.")
      .max(128, "Password is too long."),

    confirmPassword: z.string().min(1, "Please confirm your new password."),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;
