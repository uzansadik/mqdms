"use server";

import type { z } from "zod";

import { requireAuthContext } from "@/features/auth/session";

import { projectCreateSchema, projectFormSchema, projectMemberFormSchema } from "./schema";
import {
  addProjectMember,
  archiveProject,
  assignProjectPlant,
  createProject,
  ProjectRuleError,
  removeProjectMember,
  removeProjectPlant,
  restoreProject,
  updateProject,
} from "./service";

/** Aksiyon sonucu. */
export type ProjectActionResult = { success: true } | { success: false; error: string };

/** Doğrulama hatasını tek satırlık bir mesaja çevirir. */
function firstIssueMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Geçersiz veri.";
}

/** Servis hatasını kullanıcıya gösterilebilir mesaja çevirir. */
function toActionError(error: unknown): string {
  if (error instanceof ProjectRuleError) {
    return error.message;
  }

  console.error("Proje işlemi başarısız:", error);

  return "İşlem tamamlanamadı. Lütfen tekrar deneyin.";
}

export async function createProjectAction(input: unknown): Promise<ProjectActionResult> {
  const parsed = projectCreateSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error) };
  }

  const context = await requireAuthContext();

  try {
    await createProject(context, parsed.data);
    return { success: true };
  } catch (error) {
    return { success: false, error: toActionError(error) };
  }
}

export async function updateProjectAction(
  projectId: string,
  input: unknown,
): Promise<ProjectActionResult> {
  const parsed = projectFormSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error) };
  }

  const context = await requireAuthContext();

  try {
    await updateProject(context, projectId, parsed.data);
    return { success: true };
  } catch (error) {
    return { success: false, error: toActionError(error) };
  }
}

export async function archiveProjectAction(projectId: string): Promise<ProjectActionResult> {
  const context = await requireAuthContext();

  try {
    await archiveProject(context, projectId);
    return { success: true };
  } catch (error) {
    return { success: false, error: toActionError(error) };
  }
}

export async function restoreProjectAction(projectId: string): Promise<ProjectActionResult> {
  const context = await requireAuthContext();

  try {
    await restoreProject(context, projectId);
    return { success: true };
  } catch (error) {
    return { success: false, error: toActionError(error) };
  }
}

/** Projeye tesis atar. */
export async function assignProjectPlantAction(
  projectId: string,
  plantId: string,
  isPrimary: boolean,
): Promise<ProjectActionResult> {
  const context = await requireAuthContext();

  try {
    await assignProjectPlant(context, projectId, plantId, isPrimary);
    return { success: true };
  } catch (error) {
    return { success: false, error: toActionError(error) };
  }
}

/** Projeden tesisi kaldırır. */
export async function removeProjectPlantAction(
  projectId: string,
  plantId: string,
): Promise<ProjectActionResult> {
  const context = await requireAuthContext();

  try {
    await removeProjectPlant(context, projectId, plantId);
    return { success: true };
  } catch (error) {
    return { success: false, error: toActionError(error) };
  }
}

/** Proje ekibine üye ekler. */
export async function addProjectMemberAction(
  projectId: string,
  input: unknown,
): Promise<ProjectActionResult> {
  const parsed = projectMemberFormSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error) };
  }

  const context = await requireAuthContext();

  try {
    await addProjectMember(
      context,
      projectId,
      parsed.data.memberId,
      parsed.data.projectRole,
      parsed.data.responsibility,
    );

    return { success: true };
  } catch (error) {
    return { success: false, error: toActionError(error) };
  }
}

/** Üyeyi projeden çıkarır. */
export async function removeProjectMemberAction(
  projectId: string,
  memberId: string,
): Promise<ProjectActionResult> {
  const context = await requireAuthContext();

  try {
    await removeProjectMember(context, projectId, memberId);
    return { success: true };
  } catch (error) {
    return { success: false, error: toActionError(error) };
  }
}
