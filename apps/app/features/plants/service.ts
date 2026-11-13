import { writeAuditLog } from "@mqdms/audit";
import { type AuthContext, hasPermission } from "@mqdms/auth/permissions/server";
import { db } from "@mqdms/db";
import { plant } from "@mqdms/db/schema";
import { and, eq } from "drizzle-orm";

import { countActiveProjectsByPlant, findPlantByCode, getPlant } from "./repository";
import type { PlantFormValues } from "./schema";

/**
 * İş kuralı ihlali.
 *
 * Sunucu tarafı hata sınıfı: aksiyon bu hata ile dönerse form genel bir
 * hata mesajı gösterir.
 */
export class PlantRuleError extends Error {
  constructor(
    message: string,
    readonly code: "NOT_FOUND" | "CONFLICT" | "INVALID_INPUT" | "FORBIDDEN",
  ) {
    super(message);
    this.name = "PlantRuleError";
  }
}

/**
 * Yetki kontrolü.
 *
 * Servis katmanında yapılır: aksiyon, sayfa veya başka bir çağıran
 * yetkisiz bir yola ulaşsa bile kontrol kaçırılmaz.
 */
async function requirePlantPermission(context: AuthContext, action: string): Promise<void> {
  if (!(await hasPermission(context, "plants", action))) {
    throw new PlantRuleError("Bu işlem için yetkiniz yok.", "FORBIDDEN");
  }
}

/**
 * Kod normalizasyonu.
 *
 * Kod trim edilir, içteki boşluklar teke indirilir ve büyük harfe çevrilir.
 */
export function normalizePlantCode(value: string): string {
  return value.trim().replace(/\s+/g, " ").toUpperCase();
}

/** Boş string'i `null`'a çevirir. */
function toNull(value: string | undefined): string | null {
  if (value === undefined) {
    return null;
  }

  const trimmed = value.trim();

  return trimmed === "" ? null : trimmed;
}

/** Ülke kodunu büyük harfe çevirir. */
function toCountryCode(value: string | undefined): string | null {
  return toNull(value)?.toUpperCase() ?? null;
}

/** Tesis oluşturur. */
export async function createPlant(context: AuthContext, input: PlantFormValues): Promise<string> {
  await requirePlantPermission(context, "create");

  const code = normalizePlantCode(input.code);

  const existing = await findPlantByCode(context.organizationId, code);

  if (existing) {
    throw new PlantRuleError("Bu tesis kodu zaten kullanılıyor.", "CONFLICT");
  }

  const created = await db
    .insert(plant)
    .values({
      organizationId: context.organizationId,
      code,
      name: input.name.trim(),
      description: toNull(input.description),
      countryCode: toCountryCode(input.countryCode),
      city: toNull(input.city),
      address: toNull(input.address),
      postalCode: toNull(input.postalCode),
      timezone: toNull(input.timezone),
      status: input.status,
      createdById: context.userId,
    })
    .returning({ id: plant.id });

  const plantId = created[0]?.id;

  if (!plantId) {
    throw new PlantRuleError("Tesis oluşturulamadı.", "INVALID_INPUT");
  }

  await writeAuditLog({
    organizationId: context.organizationId,
    actorId: context.userId,
    action: "plant.created",
    target: { type: "plant", id: plantId },
    metadata: { code, name: input.name.trim() },
  });

  return plantId;
}

/** Tesisi günceller. */
export async function updatePlant(
  context: AuthContext,
  plantId: string,
  input: PlantFormValues,
): Promise<void> {
  await requirePlantPermission(context, "update");

  const target = await getPlant(context.organizationId, plantId);

  if (!target) {
    throw new PlantRuleError("Tesis bulunamadı.", "NOT_FOUND");
  }

  const code = normalizePlantCode(input.code);

  const existing = await findPlantByCode(context.organizationId, code, plantId);

  if (existing) {
    throw new PlantRuleError("Bu tesis kodu zaten kullanılıyor.", "CONFLICT");
  }

  await db
    .update(plant)
    .set({
      code,
      name: input.name.trim(),
      description: toNull(input.description),
      countryCode: toCountryCode(input.countryCode),
      city: toNull(input.city),
      address: toNull(input.address),
      postalCode: toNull(input.postalCode),
      timezone: toNull(input.timezone),
      status: input.status,
    })
    .where(and(eq(plant.organizationId, context.organizationId), eq(plant.id, plantId)));

  await writeAuditLog({
    organizationId: context.organizationId,
    actorId: context.userId,
    action: "plant.updated",
    target: { type: "plant", id: plantId },
    metadata: { code, name: input.name.trim() },
  });
}

/**
 * Tesisi arşivler.
 *
 * Aktif projesi bulunan tesis arşivlenemez: proje çalışmaya devam eder ve
 * tesis kaydı kaybolur.
 *
 * İlişkili kayıtlar **fiziksel olarak silinmez**.
 */
export async function archivePlant(context: AuthContext, plantId: string): Promise<void> {
  await requirePlantPermission(context, "archive");

  const target = await getPlant(context.organizationId, plantId);

  if (!target) {
    throw new PlantRuleError("Tesis bulunamadı.", "NOT_FOUND");
  }

  if (target.archivedAt) {
    return;
  }

  const activeProjects = await countActiveProjectsByPlant(context.organizationId, plantId);

  if (activeProjects > 0) {
    throw new PlantRuleError(
      "Tesisin aktif projeleri var. Önce projeleri tamamlayın veya arşivleyin.",
      "CONFLICT",
    );
  }

  await db
    .update(plant)
    .set({ archivedAt: new Date() })
    .where(and(eq(plant.organizationId, context.organizationId), eq(plant.id, plantId)));

  await writeAuditLog({
    organizationId: context.organizationId,
    actorId: context.userId,
    action: "plant.archived",
    target: { type: "plant", id: plantId },
    metadata: { code: target.code },
  });
}

/** Tesisi arşivden çıkarır. */
export async function restorePlant(context: AuthContext, plantId: string): Promise<void> {
  await requirePlantPermission(context, "restore");

  const target = await getPlant(context.organizationId, plantId);

  if (!target) {
    throw new PlantRuleError("Tesis bulunamadı.", "NOT_FOUND");
  }

  if (!target.archivedAt) {
    return;
  }

  await db
    .update(plant)
    .set({ archivedAt: null })
    .where(and(eq(plant.organizationId, context.organizationId), eq(plant.id, plantId)));

  await writeAuditLog({
    organizationId: context.organizationId,
    actorId: context.userId,
    action: "plant.restored",
    target: { type: "plant", id: plantId },
    metadata: { code: target.code },
  });
}
