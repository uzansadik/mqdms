import { writeAuditLog } from "@mqdms/audit";
import { type AuthContext, hasPermission } from "@mqdms/auth/permissions/server";
import { db } from "@mqdms/db";
import { itemUnit } from "@mqdms/db/schema";
import { and, eq } from "drizzle-orm";

import { findDimensionBaseUnit, findUnitByCode, getUnit } from "./repository";
import type { UnitFormValues } from "./schema";

/**
 * İş kuralı ihlali.
 */
export class UnitRuleError extends Error {
  constructor(
    message: string,
    readonly code: "NOT_FOUND" | "CONFLICT" | "INVALID_INPUT" | "FORBIDDEN",
  ) {
    super(message);
    this.name = "UnitRuleError";
  }
}

/**
 * Yetki kontrolü.
 *
 * Birimler item kütüphanesinin parçasıdır ve `items` izniyle yönetilir.
 */
async function requireItemPermission(context: AuthContext, action: string): Promise<void> {
  if (!(await hasPermission(context, "items", action))) {
    throw new UnitRuleError("Bu işlem için yetkiniz yok.", "FORBIDDEN");
  }
}

/**
 * Birim oluşturur.
 *
 * `conversionFactor` boş bırakılan birim boyutun taban birimi olur. Bir
 * boyutta ikinci bir taban birim oluşturulamaz: dönüşümlerin tabanı tek
 * olmalıdır.
 */
export async function createUnit(context: AuthContext, input: UnitFormValues): Promise<string> {
  await requireItemPermission(context, "create");

  return db.transaction(async (tx) => {
    const existing = await findUnitByCode(context.organizationId, input.code);

    if (existing) {
      throw new UnitRuleError("Bu birim kodu zaten kullanılıyor.", "CONFLICT");
    }

    const conversionFactor =
      input.conversionFactor === "" || input.conversionFactor === undefined
        ? null
        : input.conversionFactor;

    if (conversionFactor === null) {
      const base = await findDimensionBaseUnit(context.organizationId, input.dimension);

      if (base) {
        throw new UnitRuleError(
          `Bu boyutta zaten bir taban birim var (${base.code}). Dönüşüm faktörünü girin.`,
          "CONFLICT",
        );
      }
    }

    const created = await tx
      .insert(itemUnit)
      .values({
        organizationId: context.organizationId,
        code: input.code,
        name: input.name.trim(),
        dimension: input.dimension,
        decimalPlaces: input.decimalPlaces,
        conversionFactor,
        status: input.status,
        createdById: context.userId,
      })
      .returning({ id: itemUnit.id });

    const unitId = created[0]?.id;

    if (!unitId) {
      throw new UnitRuleError("Birim oluşturulamadı.", "INVALID_INPUT");
    }

    await writeAuditLog(
      {
        organizationId: context.organizationId,
        actorId: context.userId,
        action: "unit.created",
        target: { type: "unit", id: unitId },
        metadata: { code: input.code, dimension: input.dimension },
      },
      tx,
    );

    return unitId;
  });
}

/**
 * Birimi günceller.
 *
 * Dönüşüm faktörü değiştirilemez: birimin taban birimden kaç olduğu birimlerin
 * karşılıklı dönüşümünde kullanılır, değiştirilmesi geçmiş hesapları
 * geçersiz kılardı.
 */
export async function updateUnit(
  context: AuthContext,
  unitId: string,
  input: UnitFormValues,
): Promise<void> {
  await requireItemPermission(context, "update");

  await db.transaction(async (tx) => {
    const target = await getUnit(context.organizationId, unitId);

    if (!target) {
      throw new UnitRuleError("Birim bulunamadı.", "NOT_FOUND");
    }

    const existing = await findUnitByCode(context.organizationId, input.code);

    if (existing && existing.id !== unitId) {
      throw new UnitRuleError("Bu birim kodu zaten kullanılıyor.", "CONFLICT");
    }

    await tx
      .update(itemUnit)
      .set({
        code: input.code,
        name: input.name.trim(),
        dimension: input.dimension,
        decimalPlaces: input.decimalPlaces,
        status: input.status,
      })
      .where(and(eq(itemUnit.organizationId, context.organizationId), eq(itemUnit.id, unitId)));

    await writeAuditLog(
      {
        organizationId: context.organizationId,
        actorId: context.userId,
        action: "unit.updated",
        target: { type: "unit", id: unitId },
        metadata: { code: input.code },
      },
      tx,
    );
  });
}
