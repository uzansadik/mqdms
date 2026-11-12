"use server";

import {
  createRole,
  deleteRole,
  setMemberPermission,
  updateRole,
} from "@mqdms/auth/permissions/server";
import { z } from "zod";

import { requireRequestContext } from "@/features/auth/context";

export type SetPermissionResult = { success: true } | { success: false; error: string };

const setPermissionSchema = z.object({
  memberId: z.string().trim().min(1),

  resource: z.string().trim().min(1),
  action: z.string().trim().min(1),

  /** `inherit` grant kaydını siler ve role geri döner. */
  effect: z.enum(["allow", "deny", "inherit"]),
});

const permissionSchema = z.object({
  resource: z.string().trim().min(1),
  action: z.string().trim().min(1),
});

const createRoleSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(2)
    .max(64)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase kebab-case."),

  name: z.string().trim().min(2).max(120),

  description: z.string().trim().max(500).optional(),

  permissions: z.array(permissionSchema).max(500).default([]),
});

const updateRoleSchema = z.object({
  roleId: z.string().trim().min(1),

  name: z.string().trim().min(2).max(120).optional(),

  description: z.string().trim().max(500).nullable().optional(),

  permissions: z.array(permissionSchema).max(500).optional(),
});

const deleteRoleSchema = z.object({
  roleId: z.string().trim().min(1),
});

/**
 * Üyenin bir kaynak/aksiyon grant'ını ayarlar.
 *
 * `inherit` grant kaydını siler ve üye rolünün iznine döner. Engelleme
 * (`deny`) her zaman izinin önünde gelir.
 */
export async function setMemberPermissionAction(input: unknown): Promise<SetPermissionResult> {
  const parsed = setPermissionSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: "Invalid permission data." };
  }

  const { memberId, resource, action, effect } = parsed.data;

  const context = await requireRequestContext();

  if (!context.isOwner) {
    return { success: false, error: "You are not allowed to manage permissions." };
  }

  try {
    await setMemberPermission(context, memberId, resource, action, effect);
  } catch (error) {
    console.error("Failed to set the member permission:", error);

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unable to update the permission.",
    };
  }

  return { success: true };
}

/** Yeni rol oluşturur. */
export async function createRoleAction(input: unknown): Promise<SetPermissionResult> {
  const parsed = createRoleSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: "Invalid role data." };
  }

  const context = await requireRequestContext();

  try {
    await createRole(context, parsed.data);
  } catch (error) {
    console.error("Failed to create the role:", error);

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unable to create the role.",
    };
  }

  return { success: true };
}

/** Rolün adını, açıklamasını ve izinlerini günceller. */
export async function updateRoleAction(input: unknown): Promise<SetPermissionResult> {
  const parsed = updateRoleSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: "Invalid role data." };
  }

  const { roleId, ...rest } = parsed.data;

  const context = await requireRequestContext();

  try {
    await updateRole(context, roleId, rest);
  } catch (error) {
    console.error("Failed to update the role:", error);

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unable to update the role.",
    };
  }

  return { success: true };
}

/** Rolü siler. Bağlı üye atamaları da silinir. */
export async function deleteRoleAction(input: unknown): Promise<SetPermissionResult> {
  const parsed = deleteRoleSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: "Invalid role data." };
  }

  const context = await requireRequestContext();

  try {
    await deleteRole(context, parsed.data.roleId);
  } catch (error) {
    console.error("Failed to delete the role:", error);

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unable to delete the role.",
    };
  }

  return { success: true };
}
