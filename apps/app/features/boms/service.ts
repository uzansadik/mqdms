import { writeAuditLog } from "@mqdms/audit";
import { type AuthContext, hasPermission } from "@mqdms/auth/permissions/server";
import { db } from "@mqdms/db";
import { type BomItemSnapshot, bom, bomLine, bomRevision, itemUnit } from "@mqdms/db/schema";
import { and, eq, inArray } from "drizzle-orm";

import { getItem, getItemRevision, listItemsByIds } from "@/features/items/repository";

import { checkRootEligibility, type ItemClassification } from "./eligibility";
import {
  findActiveBomByItem,
  findBomByCode,
  getBom,
  getBomRevision,
  listBomLines,
  listBomRevisions,
  lockBomForUpdate,
} from "./repository";
import type { BomDraftSaveValues, BomFormValues } from "./schema";
import { type BomTreeLine, buildBomTree, formatRevisionLabel, validateBomTree } from "./tree";

/**
 * İş kuralı ihlali.
 */
export class BomRuleError extends Error {
  constructor(
    message: string,
    readonly code: "NOT_FOUND" | "CONFLICT" | "INVALID_INPUT" | "FORBIDDEN",
  ) {
    super(message);
    this.name = "BomRuleError";
  }
}

/** Yetki kontrolü. */
async function requireBomPermission(context: AuthContext, action: string): Promise<void> {
  if (!(await hasPermission(context, "boms", action))) {
    throw new BomRuleError("Bu işlem için yetkiniz yok.", "FORBIDDEN");
  }
}

/** Boş string'i `null`'a çevirir. */
function toNull(value: string | undefined | null): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  const trimmed = value.trim();

  return trimmed === "" ? null : trimmed;
}

/** Benzersizlik ihlali (PostgreSQL `23505`). */
function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "23505"
  );
}

/** Sınıflandırma için ürün alanlarını toplar. */
function toClassification(record: {
  id: string;
  code: string;
  name: string;
  itemType: ItemClassification["itemType"];
  structureType: ItemClassification["structureType"];
  supplyType: ItemClassification["supplyType"];
  isSellable: boolean;
  status: "ACTIVE" | "INACTIVE";
  archivedAt: Date | null;
  unitOfMeasureId: string;
}): ItemClassification {
  return {
    id: record.id,
    code: record.code,
    name: record.name,
    itemType: record.itemType,
    structureType: record.structureType,
    supplyType: record.supplyType,
    isSellable: record.isSellable,
    status: record.status,
    archivedAt: record.archivedAt,
    unitOfMeasureId: record.unitOfMeasureId,
  };
}

/** Yayın anında saklanacak ürün görünümü. */
function buildSnapshot(record: {
  code: string;
  name: string;
  itemType: ItemClassification["itemType"];
  structureType: ItemClassification["structureType"];
  supplyType: ItemClassification["supplyType"];
  isSellable: boolean;
  unitOfMeasureId: string;
  unitOfMeasureCode?: string | null;
}): BomItemSnapshot {
  return {
    code: record.code,
    name: record.name,
    itemType: record.itemType,
    structureType: record.structureType,
    supplyType: record.supplyType,
    isSellable: record.isSellable,
    unitOfMeasureId: record.unitOfMeasureId,
    unitOfMeasureCode: record.unitOfMeasureCode ?? null,
  };
}

/** Yayınlanmış bir revision'ın içeriği doğrudan değiştirilemez. */
function assertRevisionIsEditable(status: string): void {
  if (status === "RELEASED" || status === "SUPERSEDED") {
    throw new BomRuleError(
      "Yayınlanmış bir BOM revision'ı doğrudan değiştirilemez. Yeni bir taslak revision oluşturun.",
      "INVALID_INPUT",
    );
  }

  if (status === "IN_REVIEW") {
    throw new BomRuleError(
      "İncelemede olan bir BOM revision'ı doğrudan değiştirilemez. Önce düzeltme isteyin.",
      "INVALID_INPUT",
    );
  }
}

/* -------------------------------------------------------------------------
 * BOM
 * ---------------------------------------------------------------------- */

/**
 * BOM oluşturur.
 *
 * Kök ürünün uygunluğu denetlenir, aynı ürün için ikinci bir aktif BOM
 * açılamaz ve ilk revision (`REV.01 / DRAFT`) başlıkla aynı transaction'da
 * oluşturulur.
 */
export async function createBom(context: AuthContext, input: BomFormValues): Promise<string> {
  await requireBomPermission(context, "create");

  const code = input.code.trim().toUpperCase();

  try {
    return await db.transaction(async (tx) => {
      const existing = await findBomByCode(context.organizationId, code);

      if (existing) {
        throw new BomRuleError("Bu BOM kodu zaten kullanılıyor.", "CONFLICT");
      }

      const itemRecord = await getItem(context.organizationId, input.itemId);

      if (!itemRecord || itemRecord.archivedAt) {
        throw new BomRuleError("Ürün bulunamadı.", "NOT_FOUND");
      }

      const eligibility = checkRootEligibility(toClassification(itemRecord));

      if (!eligibility.ok) {
        throw new BomRuleError(eligibility.reasons.join(" "), "INVALID_INPUT");
      }

      const active = await findActiveBomByItem(context.organizationId, input.itemId);

      if (active) {
        throw new BomRuleError(
          "Bu ürün için zaten aktif bir BOM var. Mevcut BOM'u düzenleyin.",
          "CONFLICT",
        );
      }

      const created = await tx
        .insert(bom)
        .values({
          organizationId: context.organizationId,
          itemId: input.itemId,
          code,
          name: input.name.trim(),
          description: toNull(input.description),
          bomType: "MANUFACTURING",
          status: "ACTIVE",
          createdById: context.userId,
        })
        .returning({ id: bom.id });

      const bomId = created[0]?.id;

      if (!bomId) {
        throw new BomRuleError("BOM oluşturulamadı.", "INVALID_INPUT");
      }

      await tx.insert(bomRevision).values({
        organizationId: context.organizationId,
        bomId,
        revisionNumber: 1,
        revision: formatRevisionLabel(1),
        status: "DRAFT",
        lockVersion: 1,
        rootItemSnapshot: buildSnapshot(itemRecord),
        createdById: context.userId,
      });

      await writeAuditLog(
        {
          organizationId: context.organizationId,
          actorId: context.userId,
          action: "bom.created",
          target: { type: "bom", id: bomId },
          metadata: { code, itemId: input.itemId },
        },
        tx,
      );

      return bomId;
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new BomRuleError("Bu ürün için zaten aktif bir BOM var.", "CONFLICT");
    }

    throw error;
  }
}

/**
 * BOM'u günceller.
 *
 * Başlığın sahibi ürün değiştirilemez: kök ürün değişirse ürün ağacının
 * anlamı değişir.
 */
export async function updateBom(
  context: AuthContext,
  bomId: string,
  input: BomFormValues,
): Promise<void> {
  await requireBomPermission(context, "update");

  const code = input.code.trim().toUpperCase();

  await db.transaction(async (tx) => {
    const target = await getBom(context.organizationId, bomId);

    if (!target) {
      throw new BomRuleError("BOM bulunamadı.", "NOT_FOUND");
    }

    const existing = await findBomByCode(context.organizationId, code, bomId);

    if (existing) {
      throw new BomRuleError("Bu BOM kodu zaten kullanılıyor.", "CONFLICT");
    }

    await tx
      .update(bom)
      .set({
        code,
        name: input.name.trim(),
        description: toNull(input.description),
      })
      .where(and(eq(bom.organizationId, context.organizationId), eq(bom.id, bomId)));

    await writeAuditLog(
      {
        organizationId: context.organizationId,
        actorId: context.userId,
        action: "bom.updated",
        target: { type: "bom", id: bomId },
        metadata: { code },
      },
      tx,
    );
  });
}

/**
 * BOM'u arşivler.
 *
 * Arşivleme tarihsel veriyi korur; aynı ürün için yeni bir BOM açılabilir.
 */
export async function archiveBom(context: AuthContext, bomId: string): Promise<void> {
  await requireBomPermission(context, "archive");

  await db.transaction(async (tx) => {
    const target = await getBom(context.organizationId, bomId);

    if (!target) {
      throw new BomRuleError("BOM bulunamadı.", "NOT_FOUND");
    }

    if (target.archivedAt) {
      return;
    }

    await tx
      .update(bom)
      .set({ archivedAt: new Date() })
      .where(and(eq(bom.organizationId, context.organizationId), eq(bom.id, bomId)));

    await writeAuditLog(
      {
        organizationId: context.organizationId,
        actorId: context.userId,
        action: "bom.archived",
        target: { type: "bom", id: bomId },
        metadata: { code: target.code },
      },
      tx,
    );
  });
}

/** BOM'u arşivden çıkarır. */
export async function restoreBom(context: AuthContext, bomId: string): Promise<void> {
  await requireBomPermission(context, "restore");

  try {
    await db.transaction(async (tx) => {
      const target = await getBom(context.organizationId, bomId);

      if (!target) {
        throw new BomRuleError("BOM bulunamadı.", "NOT_FOUND");
      }

      if (!target.archivedAt) {
        return;
      }

      const active = await findActiveBomByItem(context.organizationId, target.itemId);

      if (active && active.id !== bomId) {
        throw new BomRuleError(
          "Bu ürün için zaten aktif bir BOM var. Önce onu arşivleyin.",
          "CONFLICT",
        );
      }

      await tx
        .update(bom)
        .set({ archivedAt: null })
        .where(and(eq(bom.organizationId, context.organizationId), eq(bom.id, bomId)));

      await writeAuditLog(
        {
          organizationId: context.organizationId,
          actorId: context.userId,
          action: "bom.restored",
          target: { type: "bom", id: bomId },
          metadata: { code: target.code },
        },
        tx,
      );
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new BomRuleError("Bu ürün için zaten aktif bir BOM var.", "CONFLICT");
    }

    throw error;
  }
}

/* -------------------------------------------------------------------------
 * BOM revision
 * ---------------------------------------------------------------------- */

/**
 * Yeni revision taslağı oluşturur.
 *
 * Yayınlanmış revision'ın satırları kopyalanır; `lineageId` korunur ve üst
 * satır bağlantıları yeniden kurulur. Kaynak revision değiştirilmez.
 */
export async function createNextBomRevision(
  context: AuthContext,
  bomId: string,
  changeReason?: string | null,
): Promise<string> {
  await requireBomPermission(context, "update");

  return db.transaction(async (tx) => {
    /*
     * Revision numarası iki eşzamanlı istekte çakışmasın diye başlık
     * satırı kilitlenir.
     */
    const header = await lockBomForUpdate(tx, context.organizationId, bomId);

    if (!header) {
      throw new BomRuleError("BOM bulunamadı.", "NOT_FOUND");
    }

    const revisions = await listBomRevisions(context.organizationId, bomId);

    const open = revisions.find(
      (revision) => revision.status === "DRAFT" || revision.status === "IN_REVIEW",
    );

    if (open) {
      throw new BomRuleError(
        `Bu BOM için zaten açık bir taslak var (${open.revision}). Önce onu tamamlayın.`,
        "CONFLICT",
      );
    }

    const released = revisions.find((revision) => revision.status === "RELEASED");

    const nextNumber =
      revisions.reduce((maxNumber, revision) => Math.max(maxNumber, revision.revisionNumber), 0) +
      1;

    const sourceLines = released ? await listBomLines(context.organizationId, released.id) : [];

    const created = await tx
      .insert(bomRevision)
      .values({
        organizationId: context.organizationId,
        bomId,
        revisionNumber: nextNumber,
        revision: formatRevisionLabel(nextNumber),
        status: "DRAFT",
        lockVersion: 1,
        changeReason: toNull(changeReason),
        supersedesRevisionId: released?.id ?? null,
        createdById: context.userId,
      })
      .returning({ id: bomRevision.id });

    const revisionId = created[0]?.id;

    if (!revisionId) {
      throw new BomRuleError("BOM revision'ı oluşturulamadı.", "INVALID_INPUT");
    }

    if (sourceLines.length > 0) {
      /*
       * Satırlar kopyalanır. Üst satır bağlantıları yeni satır kimlikleriyle
       * kurulur; `lineageId` aynı occurrence'ın izlenmesini sağlar.
       */
      const idMap = new Map<string, string>();

      for (const line of sourceLines) {
        const inserted = await tx
          .insert(bomLine)
          .values({
            organizationId: context.organizationId,
            bomRevisionId: revisionId,
            childItemId: line.childItemId,
            childItemRevisionId: line.childItemRevisionId,
            lineageId: line.lineageId,
            lineNumber: line.lineNumber,
            sortOrder: line.sortOrder,
            quantity: line.quantity,
            unitOfMeasureId: line.unitOfMeasureId,
            description: line.description,
            referenceDesignation: line.referenceDesignation,
            joiningMethod: line.joiningMethod,
            notes: line.notes,
            positionReference: line.positionReference,
          })
          .returning({ id: bomLine.id });

        const newId = inserted[0]?.id;

        if (newId) {
          idMap.set(line.id, newId);
        }
      }

      for (const line of sourceLines) {
        if (!line.parentLineId) {
          continue;
        }

        const parentId = idMap.get(line.parentLineId);
        const lineId = idMap.get(line.id);

        if (!parentId || !lineId) {
          continue;
        }

        await tx
          .update(bomLine)
          .set({ parentLineId: parentId })
          .where(and(eq(bomLine.organizationId, context.organizationId), eq(bomLine.id, lineId)));
      }
    }

    await writeAuditLog(
      {
        organizationId: context.organizationId,
        actorId: context.userId,
        action: "bomRevision.created",
        target: { type: "bomRevision", id: revisionId },
        metadata: { bomId, revisionNumber: nextNumber },
      },
      tx,
    );

    return revisionId;
  });
}

/** Revision'ı incelemeye gönderir. */
export async function submitBomForReview(context: AuthContext, revisionId: string): Promise<void> {
  await requireBomPermission(context, "submit");

  await db.transaction(async (tx) => {
    const target = await getBomRevision(context.organizationId, revisionId);

    if (!target) {
      throw new BomRuleError("BOM revision'ı bulunamadı.", "NOT_FOUND");
    }

    if (target.status !== "DRAFT") {
      throw new BomRuleError(
        "Yalnızca taslak revision'lar incelemeye gönderilebilir.",
        "INVALID_INPUT",
      );
    }

    await tx
      .update(bomRevision)
      .set({ status: "IN_REVIEW" })
      .where(
        and(eq(bomRevision.organizationId, context.organizationId), eq(bomRevision.id, revisionId)),
      );

    await writeAuditLog(
      {
        organizationId: context.organizationId,
        actorId: context.userId,
        action: "bomRevision.submitted",
        target: { type: "bomRevision", id: revisionId },
        metadata: { revision: target.revision },
      },
      tx,
    );
  });
}

/** İncelemede olan revision'ı düzeltmek için taslağa döndürür. */
export async function returnBomToDraft(context: AuthContext, revisionId: string): Promise<void> {
  await requireBomPermission(context, "submit");

  await db.transaction(async (tx) => {
    const target = await getBomRevision(context.organizationId, revisionId);

    if (!target) {
      throw new BomRuleError("BOM revision'ı bulunamadı.", "NOT_FOUND");
    }

    if (target.status !== "IN_REVIEW") {
      throw new BomRuleError(
        "Yalnızca incelemede olan revision'lar düzeltme için geri alınabilir.",
        "INVALID_INPUT",
      );
    }

    await tx
      .update(bomRevision)
      .set({ status: "DRAFT" })
      .where(
        and(eq(bomRevision.organizationId, context.organizationId), eq(bomRevision.id, revisionId)),
      );

    await writeAuditLog(
      {
        organizationId: context.organizationId,
        actorId: context.userId,
        action: "bomRevision.returned",
        target: { type: "bomRevision", id: revisionId },
        metadata: { revision: target.revision },
      },
      tx,
    );
  });
}

/**
 * Revision'ı yayınlar.
 *
 * Yayınlamadan önce bütün ağaç yeniden doğrulanır: kök uygunluğu, satır
 * kuralları, döngü ve miktar kontrolleri. Yayın anında ürün ve kök snapshot'ı
 * yazılır; önceki yayınlanmış revision `SUPERSEDED` olur.
 */
export async function releaseBomRevision(context: AuthContext, revisionId: string): Promise<void> {
  await requireBomPermission(context, "release");

  await db.transaction(async (tx) => {
    const target = await getBomRevision(context.organizationId, revisionId);

    if (!target) {
      throw new BomRuleError("BOM revision'ı bulunamadı.", "NOT_FOUND");
    }

    if (target.status === "RELEASED") {
      return;
    }

    if (target.status === "SUPERSEDED") {
      throw new BomRuleError("Bu revision artık güncel değil.", "INVALID_INPUT");
    }

    const header = await getBom(context.organizationId, target.bomId);

    if (!header) {
      throw new BomRuleError("BOM bulunamadı.", "NOT_FOUND");
    }

    const rootItem = await getItem(context.organizationId, header.itemId);

    if (!rootItem || rootItem.archivedAt) {
      throw new BomRuleError("BOM'un ürünü bulunamadı.", "NOT_FOUND");
    }

    const lines = await listBomLines(context.organizationId, revisionId);

    const tree = buildBomTree(
      lines.map(
        (line): BomTreeLine => ({
          id: line.id,
          parentLineId: line.parentLineId,
          lineageId: line.lineageId,
          lineNumber: line.lineNumber,
          sortOrder: line.sortOrder,
          quantity: line.quantity,
          unitOfMeasureId: line.unitOfMeasureId,
          childItemId: line.childItemId,
          childItemRevisionId: line.childItemRevisionId,
          childItemRevision: line.childItemRevision,
          referenceDesignation: line.referenceDesignation,
          joiningMethod: line.joiningMethod,
          description: line.description,
          notes: line.notes,
          positionReference: line.positionReference,
          childItemCode: line.childItemCode,
          childItemName: line.childItemName,
          childItemType: line.childItemType,
          childItemStructureType: line.childItemStructureType,
          childItemSupplyType: line.childItemSupplyType,
          childItemIsSellable: line.childItemIsSellable,
          childItemUnitOfMeasureId: line.childItemUnitOfMeasureId ?? "",
          childItemStatus: line.childItemStatus,
          childItemArchivedAt: line.childItemArchivedAt,
          unitOfMeasureCode: line.unitOfMeasureCode,
        }),
      ),
    );

    const validation = validateBomTree(tree, toClassification(rootItem));

    if (!validation.ok) {
      throw new BomRuleError(validation.errors.join(" "), "INVALID_INPUT");
    }

    /*
     * Önceki yayınlanmış revision `SUPERSEDED` olur: aynı anda tek yayın
     * bulunabilir kuralı veritabanında da korunur.
     */
    await tx
      .update(bomRevision)
      .set({ status: "SUPERSEDED" })
      .where(
        and(
          eq(bomRevision.organizationId, context.organizationId),
          eq(bomRevision.bomId, target.bomId),
          eq(bomRevision.status, "RELEASED"),
        ),
      );

    const unitRows = await tx
      .select({ id: itemUnit.id, code: itemUnit.code })
      .from(itemUnit)
      .where(
        inArray(
          itemUnit.id,
          Array.from(
            new Set(
              lines
                .map((line) => line.childItemUnitOfMeasureId)
                .filter((id): id is string => Boolean(id)),
            ),
          ),
        ),
      );

    const unitCodes = new Map(unitRows.map((row) => [row.id, row.code]));

    /*
     * Her satırın snapshot'ı kendi ürününe göre yazılır: ürün kartı sonradan
     * değişse bile yayınlanmış revision'ın içeriği değişmez.
     */
    for (const line of lines) {
      await tx
        .update(bomLine)
        .set({
          itemSnapshot: buildSnapshot({
            code: line.childItemCode ?? "",
            name: line.childItemName ?? "",
            itemType: line.childItemType,
            structureType: line.childItemStructureType,
            supplyType: line.childItemSupplyType,
            isSellable: line.childItemIsSellable,
            unitOfMeasureId: line.childItemUnitOfMeasureId ?? "",
            unitOfMeasureCode: unitCodes.get(line.childItemUnitOfMeasureId ?? "") ?? null,
          }),
        })
        .where(and(eq(bomLine.organizationId, context.organizationId), eq(bomLine.id, line.id)));
    }

    await tx
      .update(bomRevision)
      .set({
        status: "RELEASED",
        releasedAt: new Date(),
        releasedById: context.userId,
        rootItemSnapshot: buildSnapshot({
          code: rootItem.code,
          name: rootItem.name,
          itemType: rootItem.itemType,
          structureType: rootItem.structureType,
          supplyType: rootItem.supplyType,
          isSellable: rootItem.isSellable,
          unitOfMeasureId: rootItem.unitOfMeasureId,
        }),
      })
      .where(
        and(eq(bomRevision.organizationId, context.organizationId), eq(bomRevision.id, revisionId)),
      );

    await writeAuditLog(
      {
        organizationId: context.organizationId,
        actorId: context.userId,
        action: "bomRevision.released",
        target: { type: "bomRevision", id: revisionId },
        metadata: { revision: target.revision },
      },
      tx,
    );
  });
}

/* -------------------------------------------------------------------------
 * BOM satırları
 * ---------------------------------------------------------------------- */

/**
 * Taslak ağacı kaydeder.
 *
 * İstemci düzenlediği ağacın tamamını gönderir; sunucu farkı hesaplar:
 * eksik satırlar silinir (alt dal önce), var olan satırlar güncellenir, yeni
 * satırlar eklenir. Bütün işlemler tek transaction'da yapılır.
 */
export async function saveBomDraft(
  context: AuthContext,
  input: BomDraftSaveValues,
): Promise<{ idMap: Record<string, string>; lockVersion: number }> {
  await requireBomPermission(context, "update");

  const revision = await getBomRevision(context.organizationId, input.revisionId);

  if (!revision) {
    throw new BomRuleError("BOM revision'ı bulunamadı.", "NOT_FOUND");
  }

  assertRevisionIsEditable(revision.status);

  if (revision.lockVersion !== input.expectedLockVersion) {
    throw new BomRuleError(
      "Taslak başka bir kullanıcı tarafından değiştirilmiş. Değişikliklerinizi koruyup tekrar deneyin.",
      "CONFLICT",
    );
  }

  const header = await getBom(context.organizationId, revision.bomId);

  if (!header) {
    throw new BomRuleError("BOM bulunamadı.", "NOT_FOUND");
  }

  const rootItem = await getItem(context.organizationId, header.itemId);

  if (!rootItem || rootItem.archivedAt) {
    throw new BomRuleError("BOM'un ürünü bulunamadı.", "NOT_FOUND");
  }

  const existingLines = await listBomLines(context.organizationId, revision.id);

  /*
   * İstemcinin gönderdiği satırlar tekilleştirilir; aynı satır iki kez
   * gönderilemez.
   */
  const desired = new Map<string, (typeof input.lines)[number]>();

  for (const line of input.lines) {
    if (desired.has(line.id)) {
      throw new BomRuleError("Aynı satır birden fazla kez gönderildi.", "INVALID_INPUT");
    }

    desired.set(line.id, line);
  }

  /*
   * Üst satır referansları yalnızca aynı gönderimdeki satırlara işaret
   * edebilir.
   */
  for (const line of input.lines) {
    if (line.parentLineId !== null && !desired.has(line.parentLineId)) {
      throw new BomRuleError("Üst satır bu taslakta bulunamadı.", "INVALID_INPUT");
    }

    if (line.parentLineId === line.id) {
      throw new BomRuleError("Satır kendisini üst satır olarak gösteremez.", "INVALID_INPUT");
    }
  }

  const childItemIds = Array.from(new Set(input.lines.map((line) => line.childItemId)));

  const childItems = await listItemsByIds(context.organizationId, childItemIds);

  const itemMap = new Map(childItems.map((record) => [record.id, record]));

  for (const childItemId of childItemIds) {
    const record = itemMap.get(childItemId);

    if (!record) {
      throw new BomRuleError("Bileşen ürünü bulunamadı.", "NOT_FOUND");
    }

    if (record.archivedAt) {
      throw new BomRuleError(`"${record.code}" ürünü arşivlenmiş.`, "INVALID_INPUT");
    }
  }

  /*
   * Teknik revision'lar bileşen ürününe ait olmalıdır.
   */
  for (const line of input.lines) {
    if (!line.childItemRevisionId) {
      continue;
    }

    const itemRevision = await getItemRevision(context.organizationId, line.childItemRevisionId);

    if (!itemRevision || itemRevision.itemId !== line.childItemId) {
      throw new BomRuleError("Seçilen revision bu bileşen ürününe ait değil.", "INVALID_INPUT");
    }
  }

  /*
   * Birim geçerli olmalı ve organizasyona ait olmalıdır.
   */
  const unitIds = Array.from(
    new Set(
      input.lines
        .map((line) => line.unitOfMeasureId)
        .filter((unitId): unitId is string => Boolean(unitId)),
    ),
  );

  if (unitIds.length > 0) {
    const units = await db
      .select({ id: itemUnit.id })
      .from(itemUnit)
      .where(
        and(inArray(itemUnit.id, unitIds), eq(itemUnit.organizationId, context.organizationId)),
      );

    if (units.length !== unitIds.length) {
      throw new BomRuleError("Geçersiz birim.", "NOT_FOUND");
    }
  }

  /*
   * Taslak ağaç kurulur ve iş kuralları denetlenir.
   */
  const desiredLines: BomTreeLine[] = input.lines.map((line) => {
    const record = itemMap.get(line.childItemId);

    return {
      id: line.id,
      parentLineId: line.parentLineId,
      lineageId: line.id,
      lineNumber: 0,
      sortOrder: line.sortOrder,
      quantity: line.quantity,
      unitOfMeasureId: line.unitOfMeasureId ?? null,
      childItemId: line.childItemId,
      childItemRevisionId: line.childItemRevisionId ?? null,
      childItemRevision: null,
      referenceDesignation: line.referenceDesignation ?? null,
      joiningMethod: line.joiningMethod ?? null,
      description: line.description ?? null,
      notes: line.notes ?? null,
      positionReference: line.positionReference ?? null,
      childItemCode: record?.code ?? null,
      childItemName: record?.name ?? null,
      childItemType: record?.itemType ?? "OTHER",
      childItemStructureType: record?.structureType ?? "PART",
      childItemSupplyType: record?.supplyType ?? null,
      childItemIsSellable: record?.isSellable ?? false,
      childItemUnitOfMeasureId: record?.unitOfMeasureId ?? "",
      childItemStatus: record?.status ?? "ACTIVE",
      childItemArchivedAt: record?.archivedAt ?? null,
      unitOfMeasureCode: null,
    };
  });

  const tree = buildBomTree(desiredLines);
  const validation = validateBomTree(tree, toClassification(rootItem));

  if (!validation.ok) {
    throw new BomRuleError(validation.errors.join(" "), "INVALID_INPUT");
  }

  return db.transaction(async (tx) => {
    const idMap: Record<string, string> = {};

    const existingById = new Map(existingLines.map((line) => [line.id, line]));

    const removed = existingLines.filter((line) => !desired.has(line.id));

    /*
     * Silme işlemi alt dal önce yapılır: üst satır FK'si `NO ACTION` olduğu
     * için alt satır önce silinmelidir.
     */
    if (removed.length > 0) {
      const depthOf = (lineId: string): number => {
        let depth = 0;
        let current = existingById.get(lineId);

        while (current?.parentLineId && depth < 100) {
          depth += 1;
          current = existingById.get(current.parentLineId);
        }

        return depth;
      };

      const ordered = [...removed].sort((a, b) => depthOf(b.id) - depthOf(a.id));

      for (const line of ordered) {
        await tx
          .delete(bomLine)
          .where(and(eq(bomLine.organizationId, context.organizationId), eq(bomLine.id, line.id)));
      }
    }

    const updated = input.lines.filter((line) => existingById.has(line.id));
    const inserted = input.lines.filter((line) => !existingById.has(line.id));

    /*
     * Sıra numarası çakışmaları iki aşamalı giderilir: önce geçici değerler,
     * sonra nihai değerler. Tek aşamalı güncelleme kardeş satırların yerini
     * değiştirirken unique index'e takılır.
     */
    const TEMP_OFFSET = 100_000;

    for (const line of updated) {
      const record = existingById.get(line.id);

      if (!record) {
        continue;
      }

      await tx
        .update(bomLine)
        .set({ sortOrder: TEMP_OFFSET + line.sortOrder })
        .where(and(eq(bomLine.organizationId, context.organizationId), eq(bomLine.id, line.id)));
    }

    for (const line of updated) {
      const record = existingById.get(line.id);

      if (!record) {
        continue;
      }

      const parentLineId =
        line.parentLineId === null ? null : (idMap[line.parentLineId] ?? line.parentLineId);

      await tx
        .update(bomLine)
        .set({
          parentLineId,
          childItemId: line.childItemId,
          childItemRevisionId: line.childItemRevisionId ?? null,
          quantity: line.quantity,
          unitOfMeasureId: line.unitOfMeasureId ?? null,
          sortOrder: line.sortOrder,
          description: line.description ?? null,
          referenceDesignation: line.referenceDesignation ?? null,
          joiningMethod: line.joiningMethod ?? null,
          notes: line.notes ?? null,
          positionReference: line.positionReference ?? null,
        })
        .where(and(eq(bomLine.organizationId, context.organizationId), eq(bomLine.id, line.id)));
    }

    /*
     * Yeni satırlar üst satırdan aşağı doğru eklenir: üst satırın gerçek
     * kimliği bilinmeden alt satır eklenemez.
     */
    const insertedByDepth = [...inserted].sort((a, b) => {
      const depthOf = (line: (typeof input.lines)[number]): number => {
        let depth = 0;
        let parentId = line.parentLineId;

        while (parentId && depth < 100) {
          depth += 1;
          parentId = desired.get(parentId)?.parentLineId ?? null;
        }

        return depth;
      };

      return depthOf(a) - depthOf(b);
    });

    const usedLineNumbers = existingLines
      .filter((line) => desired.has(line.id))
      .map((line) => line.lineNumber);

    let nextLineNumberValue =
      usedLineNumbers.reduce((maxValue, value) => Math.max(maxValue, value), 0) + 1;

    for (const line of insertedByDepth) {
      const parentLineId =
        line.parentLineId === null ? null : (idMap[line.parentLineId] ?? line.parentLineId);

      const created = await tx
        .insert(bomLine)
        .values({
          organizationId: context.organizationId,
          bomRevisionId: revision.id,
          parentLineId,
          childItemId: line.childItemId,
          childItemRevisionId: line.childItemRevisionId ?? null,
          lineageId: crypto.randomUUID(),
          lineNumber: nextLineNumberValue,
          sortOrder: line.sortOrder,
          quantity: line.quantity,
          unitOfMeasureId: line.unitOfMeasureId ?? null,
          description: line.description ?? null,
          referenceDesignation: line.referenceDesignation ?? null,
          joiningMethod: line.joiningMethod ?? null,
          notes: line.notes ?? null,
          positionReference: line.positionReference ?? null,
        })
        .returning({ id: bomLine.id });

      const newId = created[0]?.id;

      if (!newId) {
        throw new BomRuleError("BOM satırı eklenemedi.", "INVALID_INPUT");
      }

      idMap[line.id] = newId;
      nextLineNumberValue += 1;
    }

    const updatedRows = await tx
      .update(bomRevision)
      .set({ lockVersion: revision.lockVersion + 1 })
      .where(
        and(
          eq(bomRevision.organizationId, context.organizationId),
          eq(bomRevision.id, revision.id),
        ),
      )
      .returning({ lockVersion: bomRevision.lockVersion });

    await writeAuditLog(
      {
        organizationId: context.organizationId,
        actorId: context.userId,
        action: "bomRevision.draftSaved",
        target: { type: "bomRevision", id: revision.id },
        metadata: {
          revision: revision.revision,
          lineCount: input.lines.length,
          added: inserted.length,
          removed: removed.length,
        },
      },
      tx,
    );

    return { idMap, lockVersion: updatedRows[0]?.lockVersion ?? revision.lockVersion + 1 };
  });
}
