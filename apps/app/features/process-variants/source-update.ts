import { writeAuditLog } from "@mqdms/audit";
import { type AuthContext, hasPermission } from "@mqdms/auth/permissions/server";
import { db } from "@mqdms/db";
import {
  flow,
  flowEdge,
  flowNode,
  flowNodeFunction,
  flowNodeWorkElement,
  processFunction,
  processFunctionRequirement,
  processIoDefinition,
  processRequirement,
  processVariant,
  processVariantApplicability,
  processVariantApplicabilityItemGroup,
  processVariantRevision,
  processVariantRevisionFlow,
  processWorkElement,
} from "@mqdms/db/schema";
import { and, eq } from "drizzle-orm";

import {
  compareRevisions,
  layoutChanges,
  type RevisionChange,
  type RevisionSnapshot,
  technicalChanges,
} from "./comparison";
import {
  getLineageSourceRevision,
  getProcessVariantRevision,
  listReleasedRevisionsOfVariant,
  type ProcessVariantRevisionRecord,
} from "./repository";
import { groupSelections, type SourceUpdateSelection } from "./source-selection";

/**
 * Kaynak revision güncellemesi.
 *
 * Bir jenerik revision yeni bir revision yayınladığında, ondan türetilmiş
 * varyantlarda **kontrollü güncelleme** yapılabilir:
 *
 * - Kaynak revision bilgisi görüntülenir.
 * - Yeni kaynak revision bulunduğu gösterilir.
 * - Eski ve yeni kaynak revision'ları karşılaştırılır.
 * - Kullanıcının seçtiği değişiklikler hedef varyantın `DRAFT` revision'ına
 *   aktarılır.
 *
 * Yayınlanmış specialized revision **otomatik değiştirilmez**.
 */

/** Kontrollü güncelleme hatası. */
export class SourceUpdateRuleError extends Error {
  constructor(
    message: string,
    readonly code:
      | "NOT_FOUND"
      | "CONFLICT"
      | "INVALID_INPUT"
      | "FORBIDDEN"
      | "INVALID_STATE" = "INVALID_INPUT",
  ) {
    super(message);
    this.name = "SourceUpdateRuleError";
  }
}

/** Yetki kontrolü. */
async function requireSourceUpdatePermission(
  context: AuthContext,
  action: "update" | "compare" = "update",
): Promise<void> {
  if (!(await hasPermission(context, "processVariants", action))) {
    throw new SourceUpdateRuleError("Bu işlem için yetkiniz yok.", "FORBIDDEN");
  }
}

/**
 * Bir revision'ın karşılaştırılabilir içeriğini yükler.
 *
 * Akışın node'ları `logicalId` üzerinden bağlanır; böylece iki revision'ın
 * edge'leri karşılaştırılabilir.
 */
export async function getRevisionSnapshot(
  organizationId: string,
  revisionId: string,
): Promise<RevisionSnapshot> {
  const flowRows = await db
    .select({ id: flow.id })
    .from(processVariantRevisionFlow)
    .innerJoin(flow, eq(flow.id, processVariantRevisionFlow.flowId))
    .where(
      and(
        eq(processVariantRevisionFlow.organizationId, organizationId),
        eq(processVariantRevisionFlow.processVariantRevisionId, revisionId),
      ),
    )
    .limit(1);

  const flowId = flowRows[0]?.id;

  const nodeRows = flowId
    ? await db
        .select({
          id: flowNode.id,
          logicalId: flowNode.logicalId,
          nodeType: flowNode.nodeType,
          title: flowNode.title,
          description: flowNode.description,
          positionX: flowNode.positionX,
          positionY: flowNode.positionY,
        })
        .from(flowNode)
        .where(and(eq(flowNode.organizationId, organizationId), eq(flowNode.flowId, flowId)))
    : [];

  const nodeLogicalIds = new Map(nodeRows.map((node) => [node.id, node.logicalId]));

  const edgeRows = flowId
    ? await db
        .select({
          id: flowEdge.id,
          logicalId: flowEdge.logicalId,
          sourceNodeId: flowEdge.sourceNodeId,
          targetNodeId: flowEdge.targetNodeId,
          label: flowEdge.label,
          condition: flowEdge.condition,
          edgeType: flowEdge.edgeType,
        })
        .from(flowEdge)
        .where(and(eq(flowEdge.organizationId, organizationId), eq(flowEdge.flowId, flowId)))
    : [];

  const workElementRows = await db
    .select({
      logicalId: processWorkElement.logicalId,
      code: processWorkElement.code,
      name: processWorkElement.name,
      description: processWorkElement.description,
      category: processWorkElement.category,
    })
    .from(processWorkElement)
    .where(
      and(
        eq(processWorkElement.organizationId, organizationId),
        eq(processWorkElement.processVariantRevisionId, revisionId),
      ),
    );

  const functionRows = await db
    .select({
      logicalId: processFunction.logicalId,
      name: processFunction.name,
      description: processFunction.description,
      functionScope: processFunction.functionScope,
    })
    .from(processFunction)
    .where(
      and(
        eq(processFunction.organizationId, organizationId),
        eq(processFunction.processVariantRevisionId, revisionId),
      ),
    );

  const requirementRows = await db
    .select({
      logicalId: processRequirement.logicalId,
      code: processRequirement.code,
      name: processRequirement.name,
      description: processRequirement.description,
      requirementType: processRequirement.requirementType,
      sourceReference: processRequirement.sourceReference,
      isMandatory: processRequirement.isMandatory,
    })
    .from(processRequirement)
    .where(
      and(
        eq(processRequirement.organizationId, organizationId),
        eq(processRequirement.processVariantRevisionId, revisionId),
      ),
    );

  const ioRows = await db
    .select({
      logicalId: processIoDefinition.logicalId,
      direction: processIoDefinition.direction,
      resourceType: processIoDefinition.resourceType,
      name: processIoDefinition.name,
      description: processIoDefinition.description,
    })
    .from(processIoDefinition)
    .where(
      and(
        eq(processIoDefinition.organizationId, organizationId),
        eq(processIoDefinition.processVariantRevisionId, revisionId),
      ),
    );

  const applicabilityRows = await db
    .select({
      id: processVariantApplicability.id,
      logicalId: processVariantApplicability.logicalId,
      name: processVariantApplicability.name,
      description: processVariantApplicability.description,
      supplyType: processVariantApplicability.supplyType,
      joiningMethod: processVariantApplicability.joiningMethod,
      itemGroupId: processVariantApplicabilityItemGroup.itemGroupId,
    })
    .from(processVariantApplicability)
    .leftJoin(
      processVariantApplicabilityItemGroup,
      eq(processVariantApplicabilityItemGroup.applicabilityId, processVariantApplicability.id),
    )
    .where(
      and(
        eq(processVariantApplicability.organizationId, organizationId),
        eq(processVariantApplicability.processVariantRevisionId, revisionId),
      ),
    );

  const applicabilities = new Map<
    string,
    {
      logicalId: string;
      name: string;
      description: string | null;
      supplyType: string | null;
      joiningMethod: string | null;
      itemGroupCodes: string[];
    }
  >();

  for (const row of applicabilityRows) {
    const existing = applicabilities.get(row.logicalId);

    if (!existing) {
      applicabilities.set(row.logicalId, {
        logicalId: row.logicalId,
        name: row.name,
        description: row.description,
        supplyType: row.supplyType,
        joiningMethod: row.joiningMethod,
        itemGroupCodes: row.itemGroupId ? [row.itemGroupId] : [],
      });

      continue;
    }

    if (row.itemGroupId) {
      existing.itemGroupCodes.push(row.itemGroupId);
    }
  }

  return {
    nodes: nodeRows.map((node) => ({
      logicalId: node.logicalId,
      nodeType: node.nodeType,
      title: node.title,
      description: node.description,
      positionX: Number(node.positionX),
      positionY: Number(node.positionY),
    })),
    edges: edgeRows.map((edge) => ({
      logicalId: edge.logicalId,
      sourceLogicalId: nodeLogicalIds.get(edge.sourceNodeId) ?? edge.sourceNodeId,
      targetLogicalId: nodeLogicalIds.get(edge.targetNodeId) ?? edge.targetNodeId,
      label: edge.label,
      condition: edge.condition,
      edgeType: edge.edgeType,
    })),
    workElements: workElementRows,
    functions: functionRows,
    requirements: requirementRows,
    io: ioRows,
    applicabilities: [...applicabilities.values()],
  };
}

/**
 * Bir kaynak revision'dan türetilmiş revision'lar.
 *
 * Lineage `sourceVariantRevisionId` üzerinden izlenir; isim eşleştirmesi
 * yapılmaz.
 */
export async function listDerivedRevisions(
  organizationId: string,
  sourceRevisionId: string,
): Promise<
  {
    id: string;
    revision: string;
    status: string;
    processVariantId: string;
    variantCode: string;
    variantName: string;
  }[]
> {
  const rows = await db
    .select({
      id: processVariantRevision.id,
      revision: processVariantRevision.revision,
      status: processVariantRevision.status,
      processVariantId: processVariantRevision.processVariantId,
      variantCode: processVariant.code,
      variantName: processVariant.name,
    })
    .from(processVariantRevision)
    .innerJoin(processVariant, eq(processVariant.id, processVariantRevision.processVariantId))
    .where(
      and(
        eq(processVariantRevision.organizationId, organizationId),
        eq(processVariantRevision.sourceVariantRevisionId, sourceRevisionId),
      ),
    );

  return rows;
}

/**
 * Hedef revision'ın lineage kaynağı.
 *
 * Öncelik varyantın **orijinal** türetme kaynağıdır: kaynak güncellemesi
 * sonrasında taslak revision'ın `sourceVariantRevisionId` değeri değişse de
 * lineage değişmez. Orijinal kaynak yoksa hedef revision'ın kendi kaynak
 * bildirimi kullanılır.
 */
async function resolveLineageSource(
  organizationId: string,
  target: { processVariantId: string; sourceVariantRevisionId: string | null },
): Promise<ProcessVariantRevisionRecord | null> {
  const lineage = await getLineageSourceRevision(organizationId, target.processVariantId);

  if (lineage) {
    return lineage;
  }

  if (!target.sourceVariantRevisionId) {
    return null;
  }

  return getProcessVariantRevision(organizationId, target.sourceVariantRevisionId);
}

/**
 * Kaynak güncellemesi adayı.
 *
 * `lineageSource`, varyantın türetildiği kaynak revision'dır. `candidates`
 * ise lineage kaynağından sonra yayınlanmış revision'lardır.
 */
export type SourceUpdateCandidate = {
  lineageSource: {
    id: string;
    revision: string;
    processVariantId: string;
    variantCode: string;
    variantName: string;
    releasedAt: Date | null;
  } | null;

  candidates: {
    id: string;
    revision: string;
    releasedAt: Date | null;
  }[];
};

/**
 * Hedef revision için güncelleme adaylarını listeler.
 *
 * Lineage, `sourceVariantRevisionId` üzerinden izlenir; isim eşleştirmesi
 * yapılmaz. Lineage kaynağı olmayan varyantlarda güncelleme yapılamaz.
 */
export async function listSourceUpdateCandidates(
  organizationId: string,
  targetRevisionId: string,
): Promise<SourceUpdateCandidate> {
  const target = await getProcessVariantRevision(organizationId, targetRevisionId);

  if (!target) {
    throw new SourceUpdateRuleError("Hedef revision bulunamadı.", "NOT_FOUND");
  }

  const lineageSource = await resolveLineageSource(organizationId, target);

  if (!lineageSource) {
    return { lineageSource: null, candidates: [] };
  }

  const sourceVariantRows = await db
    .select({ code: processVariant.code, name: processVariant.name })
    .from(processVariant)
    .where(
      and(
        eq(processVariant.organizationId, organizationId),
        eq(processVariant.id, lineageSource.processVariantId),
      ),
    )
    .limit(1);

  const released = await listReleasedRevisionsOfVariant(
    organizationId,
    lineageSource.processVariantId,
  );

  const candidates = released
    .filter((entry) => {
      if (entry.id === lineageSource.id) {
        return false;
      }

      // Yalnızca lineage kaynağından sonra yayınlananlar adaydır.
      if (!lineageSource.releasedAt || !entry.releasedAt) {
        return true;
      }

      return entry.releasedAt > lineageSource.releasedAt;
    })
    .map((entry) => ({ id: entry.id, revision: entry.revision, releasedAt: entry.releasedAt }));

  return {
    lineageSource: {
      id: lineageSource.id,
      revision: lineageSource.revision,
      processVariantId: lineageSource.processVariantId,
      variantCode: sourceVariantRows[0]?.code ?? "",
      variantName: sourceVariantRows[0]?.name ?? "",
      releasedAt: lineageSource.releasedAt,
    },
    candidates,
  };
}

/**
 * Lineage kaynağı ile seçilen yeni kaynak revision arasındaki fark.
 *
 * Teknik değişiklikler ve görsel düzen değişiklikleri ayrı döner.
 *
 * Karşılaştırma revision'ın teknik içeriğini okur; bu nedenle yetki
 * kontrolü zorunludur.
 */
export async function getSourceUpdateChanges(
  context: AuthContext,
  targetRevisionId: string,
  sourceRevisionId: string,
): Promise<{ changes: RevisionChange[]; technical: RevisionChange[]; layout: RevisionChange[] }> {
  await requireSourceUpdatePermission(context, "compare");

  const organizationId = context.organizationId;

  const target = await getProcessVariantRevision(organizationId, targetRevisionId);

  if (!target) {
    throw new SourceUpdateRuleError("Hedef revision bulunamadı.", "NOT_FOUND");
  }

  const lineageSource = await resolveLineageSource(organizationId, target);

  if (!lineageSource) {
    throw new SourceUpdateRuleError(
      "Bu varyant bir kaynak revision'dan türetilmemiş.",
      "INVALID_INPUT",
    );
  }

  /*
   * Karşılaştırılacak kaynak revision, lineage kaynağının aynı varyantında
   * ve yayınlanmış olmalıdır: başka bir varyantın taslağı karşılaştırma
   * tabanı olamaz.
   */
  const source = await getProcessVariantRevision(organizationId, sourceRevisionId);

  if (!source) {
    throw new SourceUpdateRuleError("Kaynak revision bulunamadı.", "NOT_FOUND");
  }

  if (source.status !== "RELEASED") {
    throw new SourceUpdateRuleError("Kaynak revision yayınlanmış olmalıdır.", "INVALID_STATE");
  }

  if (source.processVariantId !== lineageSource.processVariantId) {
    throw new SourceUpdateRuleError(
      "Kaynak revision, lineage kaynağıyla aynı varyanta ait olmalıdır.",
      "INVALID_INPUT",
    );
  }

  const [before, after] = await Promise.all([
    getRevisionSnapshot(organizationId, lineageSource.id),
    getRevisionSnapshot(organizationId, sourceRevisionId),
  ]);

  const changes = compareRevisions(before, after);

  return { changes, technical: technicalChanges(changes), layout: layoutChanges(changes) };
}

/**
 * Kaynak revision güncellemesini hedef `DRAFT` revision'a uygular.
 *
 * Yalnızca kullanıcının seçtiği kayıtlar aktarılır; hedef revision'ın kendi
 * özelleştirmeleri seçilmemiş kayıtlarda korunur.
 *
 * Kaynak revision, lineage kaynağının **aynı varyantında** olmalıdır: başka
 * bir varyanttan içerik aktarılmaz.
 */
export async function applySourceUpdate(
  context: AuthContext,
  input: {
    /** Güncelleme yapılacak hedef revision (DRAFT olmalı). */
    targetRevisionId: string;

    /** Yeni içeriğin alınacağı kaynak revision. */
    sourceRevisionId: string;

    /** Aktarılacak kayıtlar. */
    selections: SourceUpdateSelection[];
  },
): Promise<{ applied: number }> {
  await requireSourceUpdatePermission(context);

  const target = await getProcessVariantRevision(context.organizationId, input.targetRevisionId);

  if (!target) {
    throw new SourceUpdateRuleError("Hedef revision bulunamadı.", "NOT_FOUND");
  }

  if (target.status !== "DRAFT") {
    throw new SourceUpdateRuleError(
      "Güncelleme yalnızca taslak revision'a uygulanabilir.",
      "INVALID_STATE",
    );
  }

  const source = await getProcessVariantRevision(context.organizationId, input.sourceRevisionId);

  if (!source) {
    throw new SourceUpdateRuleError("Kaynak revision bulunamadı.", "NOT_FOUND");
  }

  if (source.status !== "RELEASED") {
    throw new SourceUpdateRuleError("Kaynak revision yayınlanmış olmalıdır.", "INVALID_STATE");
  }

  const lineageSource = await resolveLineageSource(context.organizationId, target);

  if (!lineageSource) {
    throw new SourceUpdateRuleError(
      "Bu varyant bir kaynak revision'dan türetilmemiş.",
      "INVALID_INPUT",
    );
  }

  if (source.processVariantId !== lineageSource.processVariantId) {
    throw new SourceUpdateRuleError(
      "Kaynak revision, lineage kaynağıyla aynı varyanta ait olmalıdır.",
      "INVALID_INPUT",
    );
  }

  const selected = groupSelections(input.selections);

  if (selected.size === 0) {
    throw new SourceUpdateRuleError("Hiçbir değişiklik seçilmedi.", "INVALID_INPUT");
  }

  const workElementSelection = selected.get("WORK_ELEMENT");
  const requirementSelection = selected.get("REQUIREMENT");
  const functionSelection = selected.get("FUNCTION");
  const ioSelection = selected.get("IO");
  const applicabilitySelection = selected.get("APPLICABILITY");
  const flowSelection = selected.get("FLOW");

  return db.transaction(async (tx) => {
    let applied = 0;

    // Work element'ler.
    const targetWorkElements = await tx
      .select({
        id: processWorkElement.id,
        logicalId: processWorkElement.logicalId,
      })
      .from(processWorkElement)
      .where(
        and(
          eq(processWorkElement.organizationId, context.organizationId),
          eq(processWorkElement.processVariantRevisionId, target.id),
        ),
      );

    // Hedefteki work element'ler mantıksal kimlik üzerinden eşleştirilir.
    const workElementByLogicalId = new Map(
      targetWorkElements.map((entry) => [entry.logicalId, entry.id]),
    );

    if (workElementSelection) {
      const sourceWorkElements = await tx
        .select()
        .from(processWorkElement)
        .where(
          and(
            eq(processWorkElement.organizationId, context.organizationId),
            eq(processWorkElement.processVariantRevisionId, source.id),
          ),
        );

      for (const record of sourceWorkElements) {
        if (!workElementSelection.has(record.logicalId)) {
          continue;
        }

        const existingId = workElementByLogicalId.get(record.logicalId);

        if (existingId) {
          await tx
            .update(processWorkElement)
            .set({
              code: record.code,
              name: record.name,
              description: record.description,
              category: record.category,
              itemId: record.itemId,
              itemGroupId: record.itemGroupId,
              derivedFromId: record.id,
            })
            .where(eq(processWorkElement.id, existingId));
        } else {
          const newId = crypto.randomUUID();

          workElementByLogicalId.set(record.logicalId, newId);

          await tx.insert(processWorkElement).values({
            id: newId,
            organizationId: context.organizationId,
            processVariantRevisionId: target.id,
            logicalId: record.logicalId,
            derivedFromId: record.id,
            code: record.code,
            name: record.name,
            description: record.description,
            category: record.category,
            itemId: record.itemId,
            itemGroupId: record.itemGroupId,
            sortOrder: record.sortOrder,
          });
        }

        applied += 1;
      }
    }

    // Gereklilikler.
    const targetRequirements = await tx
      .select({ id: processRequirement.id, logicalId: processRequirement.logicalId })
      .from(processRequirement)
      .where(
        and(
          eq(processRequirement.organizationId, context.organizationId),
          eq(processRequirement.processVariantRevisionId, target.id),
        ),
      );

    const requirementByLogicalId = new Map(
      targetRequirements.map((entry) => [entry.logicalId, entry.id]),
    );

    if (requirementSelection) {
      const sourceRequirements = await tx
        .select()
        .from(processRequirement)
        .where(
          and(
            eq(processRequirement.organizationId, context.organizationId),
            eq(processRequirement.processVariantRevisionId, source.id),
          ),
        );

      for (const record of sourceRequirements) {
        if (!requirementSelection.has(record.logicalId)) {
          continue;
        }

        const existingId = requirementByLogicalId.get(record.logicalId);

        if (existingId) {
          await tx
            .update(processRequirement)
            .set({
              code: record.code,
              name: record.name,
              description: record.description,
              requirementType: record.requirementType,
              sourceReference: record.sourceReference,
              isMandatory: record.isMandatory,
              derivedFromId: record.id,
            })
            .where(eq(processRequirement.id, existingId));
        } else {
          const newId = crypto.randomUUID();

          requirementByLogicalId.set(record.logicalId, newId);

          await tx.insert(processRequirement).values({
            id: newId,
            organizationId: context.organizationId,
            processVariantRevisionId: target.id,
            logicalId: record.logicalId,
            derivedFromId: record.id,
            code: record.code,
            name: record.name,
            description: record.description,
            requirementType: record.requirementType,
            sourceReference: record.sourceReference,
            isMandatory: record.isMandatory,
          });
        }

        applied += 1;
      }
    }

    // Fonksiyonlar.
    const targetFunctions = await tx
      .select({ id: processFunction.id, logicalId: processFunction.logicalId })
      .from(processFunction)
      .where(
        and(
          eq(processFunction.organizationId, context.organizationId),
          eq(processFunction.processVariantRevisionId, target.id),
        ),
      );

    const functionByLogicalId = new Map(
      targetFunctions.map((entry) => [entry.logicalId, entry.id]),
    );

    if (functionSelection) {
      const sourceFunctions = await tx
        .select()
        .from(processFunction)
        .where(
          and(
            eq(processFunction.organizationId, context.organizationId),
            eq(processFunction.processVariantRevisionId, source.id),
          ),
        );

      for (const record of sourceFunctions) {
        if (!functionSelection.has(record.logicalId)) {
          continue;
        }

        // Work element referansı mantıksal kimlik üzerinden eşlenir; hedefte
        // karşılığı yoksa referans boş bırakılır (kırık referans oluşmaz).
        const sourceWorkElement = record.processWorkElementId
          ? await tx
              .select({ logicalId: processWorkElement.logicalId })
              .from(processWorkElement)
              .where(
                and(
                  eq(processWorkElement.organizationId, context.organizationId),
                  eq(processWorkElement.id, record.processWorkElementId),
                ),
              )
              .limit(1)
          : [];

        const targetWorkElementId = sourceWorkElement[0]
          ? (workElementByLogicalId.get(sourceWorkElement[0].logicalId) ?? null)
          : null;

        const existingId = functionByLogicalId.get(record.logicalId);

        if (existingId) {
          await tx
            .update(processFunction)
            .set({
              name: record.name,
              description: record.description,
              functionScope: record.functionScope,
              processWorkElementId: targetWorkElementId,
              derivedFromId: record.id,
            })
            .where(eq(processFunction.id, existingId));
        } else {
          const newId = crypto.randomUUID();

          functionByLogicalId.set(record.logicalId, newId);

          await tx.insert(processFunction).values({
            id: newId,
            organizationId: context.organizationId,
            processVariantRevisionId: target.id,
            logicalId: record.logicalId,
            derivedFromId: record.id,
            name: record.name,
            description: record.description,
            functionScope: record.functionScope,
            processWorkElementId: targetWorkElementId,
          });
        }

        applied += 1;
      }
    }

    // Fonksiyon ↔ gereklilik bağlantıları.
    if (functionSelection && requirementSelection) {
      const sourceFunctions = await tx
        .select({ id: processFunction.id, logicalId: processFunction.logicalId })
        .from(processFunction)
        .where(
          and(
            eq(processFunction.organizationId, context.organizationId),
            eq(processFunction.processVariantRevisionId, source.id),
          ),
        );

      const sourceRequirements = await tx
        .select({ id: processRequirement.id, logicalId: processRequirement.logicalId })
        .from(processRequirement)
        .where(
          and(
            eq(processRequirement.organizationId, context.organizationId),
            eq(processRequirement.processVariantRevisionId, source.id),
          ),
        );

      const sourceFunctionById = new Map(
        sourceFunctions.map((entry) => [entry.id, entry.logicalId]),
      );
      const sourceRequirementById = new Map(
        sourceRequirements.map((entry) => [entry.id, entry.logicalId]),
      );

      const sourceLinks = await tx
        .select({
          processFunctionId: processFunctionRequirement.processFunctionId,
          processRequirementId: processFunctionRequirement.processRequirementId,
        })
        .from(processFunctionRequirement)
        .innerJoin(
          processFunction,
          eq(processFunction.id, processFunctionRequirement.processFunctionId),
        )
        .where(
          and(
            eq(processFunctionRequirement.organizationId, context.organizationId),
            // Yalnızca kaynak revision'ın fonksiyonlarına ait bağlantılar.
            eq(processFunction.processVariantRevisionId, source.id),
          ),
        );

      for (const link of sourceLinks) {
        const functionLogicalId = sourceFunctionById.get(link.processFunctionId);
        const requirementLogicalId = sourceRequirementById.get(link.processRequirementId);

        if (!functionLogicalId || !requirementLogicalId) {
          continue;
        }

        if (!functionSelection.has(functionLogicalId)) {
          continue;
        }

        if (!requirementSelection.has(requirementLogicalId)) {
          continue;
        }

        const targetFunctionId = functionByLogicalId.get(functionLogicalId);
        const targetRequirementId = requirementByLogicalId.get(requirementLogicalId);

        if (!targetFunctionId || !targetRequirementId) {
          continue;
        }

        const existingLink = await tx
          .select({ id: processFunctionRequirement.id })
          .from(processFunctionRequirement)
          .where(
            and(
              eq(processFunctionRequirement.organizationId, context.organizationId),
              eq(processFunctionRequirement.processFunctionId, targetFunctionId),
              eq(processFunctionRequirement.processRequirementId, targetRequirementId),
            ),
          )
          .limit(1);

        if (existingLink[0]) {
          continue;
        }

        await tx.insert(processFunctionRequirement).values({
          organizationId: context.organizationId,
          processFunctionId: targetFunctionId,
          processRequirementId: targetRequirementId,
        });
      }
    }

    // Girdi / çıktı tanımları.
    if (ioSelection) {
      const sourceIo = await tx
        .select()
        .from(processIoDefinition)
        .where(
          and(
            eq(processIoDefinition.organizationId, context.organizationId),
            eq(processIoDefinition.processVariantRevisionId, source.id),
          ),
        );

      const targetIo = await tx
        .select({ id: processIoDefinition.id, logicalId: processIoDefinition.logicalId })
        .from(processIoDefinition)
        .where(
          and(
            eq(processIoDefinition.organizationId, context.organizationId),
            eq(processIoDefinition.processVariantRevisionId, target.id),
          ),
        );

      const ioByLogicalId = new Map(targetIo.map((entry) => [entry.logicalId, entry.id]));

      for (const record of sourceIo) {
        if (!ioSelection.has(record.logicalId)) {
          continue;
        }

        const existingId = ioByLogicalId.get(record.logicalId);

        if (existingId) {
          await tx
            .update(processIoDefinition)
            .set({
              direction: record.direction,
              resourceType: record.resourceType,
              name: record.name,
              description: record.description,
              itemGroupId: record.itemGroupId,
              itemId: record.itemId,
              processState: record.processState,
              isRequired: record.isRequired,
              derivedFromId: record.id,
            })
            .where(eq(processIoDefinition.id, existingId));
        } else {
          const newId = crypto.randomUUID();

          ioByLogicalId.set(record.logicalId, newId);

          await tx.insert(processIoDefinition).values({
            id: newId,
            organizationId: context.organizationId,
            processVariantRevisionId: target.id,
            logicalId: record.logicalId,
            derivedFromId: record.id,
            direction: record.direction,
            resourceType: record.resourceType,
            name: record.name,
            description: record.description,
            itemGroupId: record.itemGroupId,
            itemId: record.itemId,
            processState: record.processState,
            isRequired: record.isRequired,
            sortOrder: record.sortOrder,
          });
        }

        applied += 1;
      }
    }

    // Applicability kuralları.
    if (applicabilitySelection) {
      const sourceApplicabilities = await tx
        .select()
        .from(processVariantApplicability)
        .where(
          and(
            eq(processVariantApplicability.organizationId, context.organizationId),
            eq(processVariantApplicability.processVariantRevisionId, source.id),
          ),
        );

      const targetApplicabilities = await tx
        .select({
          id: processVariantApplicability.id,
          logicalId: processVariantApplicability.logicalId,
        })
        .from(processVariantApplicability)
        .where(
          and(
            eq(processVariantApplicability.organizationId, context.organizationId),
            eq(processVariantApplicability.processVariantRevisionId, target.id),
          ),
        );

      const applicabilityByLogicalId = new Map(
        targetApplicabilities.map((entry) => [entry.logicalId, entry.id]),
      );

      for (const record of sourceApplicabilities) {
        if (!applicabilitySelection.has(record.logicalId)) {
          continue;
        }

        const existingId = applicabilityByLogicalId.get(record.logicalId);

        let applicabilityId = existingId;

        if (existingId) {
          await tx
            .update(processVariantApplicability)
            .set({
              name: record.name,
              description: record.description,
              supplyType: record.supplyType,
              joiningMethod: record.joiningMethod,
              isActive: record.isActive,
              derivedFromId: record.id,
            })
            .where(eq(processVariantApplicability.id, existingId));
        } else {
          applicabilityId = crypto.randomUUID();

          applicabilityByLogicalId.set(record.logicalId, applicabilityId);

          await tx.insert(processVariantApplicability).values({
            id: applicabilityId,
            organizationId: context.organizationId,
            processVariantRevisionId: target.id,
            logicalId: record.logicalId,
            derivedFromId: record.id,
            name: record.name,
            description: record.description,
            supplyType: record.supplyType,
            joiningMethod: record.joiningMethod,
            isActive: record.isActive,
          });
        }

        // Item group bağlantıları hedefteki ile birebir eşleştirilir.
        const sourceGroups = await tx
          .select({
            itemGroupId: processVariantApplicabilityItemGroup.itemGroupId,
            includeDescendants: processVariantApplicabilityItemGroup.includeDescendants,
          })
          .from(processVariantApplicabilityItemGroup)
          .where(
            and(
              eq(processVariantApplicabilityItemGroup.organizationId, context.organizationId),
              eq(processVariantApplicabilityItemGroup.applicabilityId, record.id),
            ),
          );

        if (!applicabilityId || sourceGroups.length === 0) {
          applied += 1;

          continue;
        }

        const targetGroups = await tx
          .select({ itemGroupId: processVariantApplicabilityItemGroup.itemGroupId })
          .from(processVariantApplicabilityItemGroup)
          .where(
            and(
              eq(processVariantApplicabilityItemGroup.organizationId, context.organizationId),
              eq(processVariantApplicabilityItemGroup.applicabilityId, applicabilityId),
            ),
          );

        const targetGroupIds = new Set(targetGroups.map((entry) => entry.itemGroupId));

        for (const group of sourceGroups) {
          if (targetGroupIds.has(group.itemGroupId)) {
            continue;
          }

          await tx.insert(processVariantApplicabilityItemGroup).values({
            organizationId: context.organizationId,
            applicabilityId,
            itemGroupId: group.itemGroupId,
            includeDescendants: group.includeDescendants,
          });
        }

        applied += 1;
      }
    }

    // Flow: node'lar ve edge'ler.
    if (flowSelection) {
      const sourceFlowRows = await tx
        .select({ id: flow.id, name: flow.name, description: flow.description })
        .from(processVariantRevisionFlow)
        .innerJoin(flow, eq(flow.id, processVariantRevisionFlow.flowId))
        .where(
          and(
            eq(processVariantRevisionFlow.organizationId, context.organizationId),
            eq(processVariantRevisionFlow.processVariantRevisionId, source.id),
          ),
        )
        .limit(1);

      const sourceFlow = sourceFlowRows[0];

      if (sourceFlow) {
        const targetFlowRows = await tx
          .select({ id: flow.id })
          .from(processVariantRevisionFlow)
          .innerJoin(flow, eq(flow.id, processVariantRevisionFlow.flowId))
          .where(
            and(
              eq(processVariantRevisionFlow.organizationId, context.organizationId),
              eq(processVariantRevisionFlow.processVariantRevisionId, target.id),
            ),
          )
          .limit(1);

        let flowId = targetFlowRows[0]?.id;

        if (!flowId) {
          const createdFlow = await tx
            .insert(flow)
            .values({
              organizationId: context.organizationId,
              name: sourceFlow.name,
              description: sourceFlow.description,
              flowType: "PROCESS_VARIANT",
              createdById: context.userId,
            })
            .returning({ id: flow.id });

          flowId = createdFlow[0]?.id;

          if (flowId) {
            await tx.insert(processVariantRevisionFlow).values({
              organizationId: context.organizationId,
              processVariantRevisionId: target.id,
              flowId,
            });
          }
        }

        if (flowId) {
          const targetNodes = await tx
            .select({ id: flowNode.id, logicalId: flowNode.logicalId })
            .from(flowNode)
            .where(
              and(eq(flowNode.organizationId, context.organizationId), eq(flowNode.flowId, flowId)),
            );

          const nodeByLogicalId = new Map(targetNodes.map((entry) => [entry.logicalId, entry.id]));

          const sourceNodes = await tx
            .select()
            .from(flowNode)
            .where(
              and(
                eq(flowNode.organizationId, context.organizationId),
                eq(flowNode.flowId, sourceFlow.id),
              ),
            );

          for (const record of sourceNodes) {
            if (!flowSelection.has(record.logicalId)) {
              continue;
            }

            const existingId = nodeByLogicalId.get(record.logicalId);

            if (existingId) {
              // Konum (layout) değişikliği teknik değişiklik sayılmaz; yalnızca
              // teknik alanlar güncellenir.
              await tx
                .update(flowNode)
                .set({
                  nodeType: record.nodeType,
                  title: record.title,
                  description: record.description,
                  width: record.width,
                  height: record.height,
                  config: record.config,
                  derivedFromId: record.id,
                })
                .where(eq(flowNode.id, existingId));
            } else {
              const newId = crypto.randomUUID();

              nodeByLogicalId.set(record.logicalId, newId);

              await tx.insert(flowNode).values({
                id: newId,
                organizationId: context.organizationId,
                flowId,
                logicalId: record.logicalId,
                derivedFromId: record.id,
                nodeType: record.nodeType,
                title: record.title,
                description: record.description,
                positionX: record.positionX,
                positionY: record.positionY,
                width: record.width,
                height: record.height,
                config: record.config,
                sortOrder: record.sortOrder,
              });
            }

            applied += 1;
          }

          const targetEdges = await tx
            .select({ id: flowEdge.id, logicalId: flowEdge.logicalId })
            .from(flowEdge)
            .where(
              and(eq(flowEdge.organizationId, context.organizationId), eq(flowEdge.flowId, flowId)),
            );

          const edgeByLogicalId = new Map(targetEdges.map((entry) => [entry.logicalId, entry.id]));

          const sourceEdges = await tx
            .select()
            .from(flowEdge)
            .where(
              and(
                eq(flowEdge.organizationId, context.organizationId),
                eq(flowEdge.flowId, sourceFlow.id),
              ),
            );

          for (const record of sourceEdges) {
            if (!flowSelection.has(record.logicalId)) {
              continue;
            }

            // Kırık referans oluşmaz: eşleşmeyen node yoksa edge kopyalanmaz.
            const sourceNode = await tx
              .select({ logicalId: flowNode.logicalId })
              .from(flowNode)
              .where(
                and(
                  eq(flowNode.organizationId, context.organizationId),
                  eq(flowNode.id, record.sourceNodeId),
                ),
              )
              .limit(1);

            const targetNode = await tx
              .select({ logicalId: flowNode.logicalId })
              .from(flowNode)
              .where(
                and(
                  eq(flowNode.organizationId, context.organizationId),
                  eq(flowNode.id, record.targetNodeId),
                ),
              )
              .limit(1);

            const sourceNodeLogicalId = sourceNode[0]?.logicalId;
            const targetNodeLogicalId = targetNode[0]?.logicalId;

            const newSourceId = sourceNodeLogicalId
              ? nodeByLogicalId.get(sourceNodeLogicalId)
              : undefined;
            const newTargetId = targetNodeLogicalId
              ? nodeByLogicalId.get(targetNodeLogicalId)
              : undefined;

            if (!newSourceId || !newTargetId) {
              continue;
            }

            const existingId = edgeByLogicalId.get(record.logicalId);

            if (existingId) {
              await tx
                .update(flowEdge)
                .set({
                  sourceNodeId: newSourceId,
                  targetNodeId: newTargetId,
                  sourceHandle: record.sourceHandle,
                  targetHandle: record.targetHandle,
                  label: record.label,
                  condition: record.condition,
                  edgeType: record.edgeType,
                  derivedFromId: record.id,
                })
                .where(eq(flowEdge.id, existingId));
            } else {
              const newId = crypto.randomUUID();

              edgeByLogicalId.set(record.logicalId, newId);

              await tx.insert(flowEdge).values({
                id: newId,
                organizationId: context.organizationId,
                flowId,
                logicalId: record.logicalId,
                derivedFromId: record.id,
                sourceNodeId: newSourceId,
                targetNodeId: newTargetId,
                sourceHandle: record.sourceHandle,
                targetHandle: record.targetHandle,
                label: record.label,
                condition: record.condition,
                edgeType: record.edgeType,
                sortOrder: record.sortOrder,
              });
            }

            applied += 1;
          }

          // Node ↔ work element ve node ↔ fonksiyon bağlantıları, ilgili
          // kayıtlar da aktarıldıysa taşınır.
          const sourceNodeLinks = await tx
            .select({
              flowNodeId: flowNodeWorkElement.flowNodeId,
              processWorkElementId: flowNodeWorkElement.processWorkElementId,
              description: flowNodeWorkElement.description,
            })
            .from(flowNodeWorkElement)
            .innerJoin(flowNode, eq(flowNode.id, flowNodeWorkElement.flowNodeId))
            .where(
              and(
                eq(flowNodeWorkElement.organizationId, context.organizationId),
                // Yalnızca kaynak akışın node'larına ait bağlantılar.
                eq(flowNode.flowId, sourceFlow.id),
              ),
            );

          for (const link of sourceNodeLinks) {
            const sourceNodeRows = await tx
              .select({ logicalId: flowNode.logicalId })
              .from(flowNode)
              .where(
                and(
                  eq(flowNode.organizationId, context.organizationId),
                  eq(flowNode.id, link.flowNodeId),
                ),
              )
              .limit(1);

            const sourceWorkElementRows = await tx
              .select({ logicalId: processWorkElement.logicalId })
              .from(processWorkElement)
              .where(
                and(
                  eq(processWorkElement.organizationId, context.organizationId),
                  eq(processWorkElement.id, link.processWorkElementId),
                ),
              )
              .limit(1);

            const nodeLogicalId = sourceNodeRows[0]?.logicalId;
            const workElementLogicalId = sourceWorkElementRows[0]?.logicalId;

            if (!nodeLogicalId || !workElementLogicalId) {
              continue;
            }

            if (!flowSelection.has(nodeLogicalId)) {
              continue;
            }

            if (workElementSelection && !workElementSelection.has(workElementLogicalId)) {
              continue;
            }

            const newNodeId = nodeByLogicalId.get(nodeLogicalId);
            const newWorkElementId = workElementByLogicalId.get(workElementLogicalId);

            if (!newNodeId || !newWorkElementId) {
              continue;
            }

            const existingLink = await tx
              .select({ id: flowNodeWorkElement.id })
              .from(flowNodeWorkElement)
              .where(
                and(
                  eq(flowNodeWorkElement.organizationId, context.organizationId),
                  eq(flowNodeWorkElement.flowNodeId, newNodeId),
                  eq(flowNodeWorkElement.processWorkElementId, newWorkElementId),
                ),
              )
              .limit(1);

            if (existingLink[0]) {
              continue;
            }

            await tx.insert(flowNodeWorkElement).values({
              organizationId: context.organizationId,
              flowNodeId: newNodeId,
              processWorkElementId: newWorkElementId,
              description: link.description,
            });
          }

          const sourceFunctionLinks = await tx
            .select({
              flowNodeId: flowNodeFunction.flowNodeId,
              processFunctionId: flowNodeFunction.processFunctionId,
            })
            .from(flowNodeFunction)
            .innerJoin(flowNode, eq(flowNode.id, flowNodeFunction.flowNodeId))
            .where(
              and(
                eq(flowNodeFunction.organizationId, context.organizationId),
                // Yalnızca kaynak akışın node'larına ait bağlantılar.
                eq(flowNode.flowId, sourceFlow.id),
              ),
            );

          for (const link of sourceFunctionLinks) {
            const sourceNodeRows = await tx
              .select({ logicalId: flowNode.logicalId })
              .from(flowNode)
              .where(
                and(
                  eq(flowNode.organizationId, context.organizationId),
                  eq(flowNode.id, link.flowNodeId),
                ),
              )
              .limit(1);

            const sourceFunctionRows = await tx
              .select({ logicalId: processFunction.logicalId })
              .from(processFunction)
              .where(
                and(
                  eq(processFunction.organizationId, context.organizationId),
                  eq(processFunction.id, link.processFunctionId),
                ),
              )
              .limit(1);

            const nodeLogicalId = sourceNodeRows[0]?.logicalId;
            const functionLogicalId = sourceFunctionRows[0]?.logicalId;

            if (!nodeLogicalId || !functionLogicalId) {
              continue;
            }

            if (!flowSelection.has(nodeLogicalId)) {
              continue;
            }

            if (functionSelection && !functionSelection.has(functionLogicalId)) {
              continue;
            }

            const newNodeId = nodeByLogicalId.get(nodeLogicalId);
            const newFunctionId = functionByLogicalId.get(functionLogicalId);

            if (!newNodeId || !newFunctionId) {
              continue;
            }

            const existingLink = await tx
              .select({ id: flowNodeFunction.id })
              .from(flowNodeFunction)
              .where(
                and(
                  eq(flowNodeFunction.organizationId, context.organizationId),
                  eq(flowNodeFunction.flowNodeId, newNodeId),
                  eq(flowNodeFunction.processFunctionId, newFunctionId),
                ),
              )
              .limit(1);

            if (existingLink[0]) {
              continue;
            }

            await tx.insert(flowNodeFunction).values({
              organizationId: context.organizationId,
              flowNodeId: newNodeId,
              processFunctionId: newFunctionId,
            });
          }
        }
      }
    }

    /*
     * Taslak revision artık bu kaynak revision'ı yansıtır.
     *
     * Sürüm artırılır: teknik içerik değiştiği için, eski edit ekranından
     * gelen kayıt (akış kaydetme) reddedilir. Aksi halde kullanıcının
     * transfer edilen node'ları sessizce silinirdi.
     */
    const locked = await tx
      .select({ id: processVariantRevision.id, version: processVariantRevision.version })
      .from(processVariantRevision)
      .where(
        and(
          eq(processVariantRevision.organizationId, context.organizationId),
          eq(processVariantRevision.id, target.id),
        ),
      )
      .for("update")
      .limit(1);

    await tx
      .update(processVariantRevision)
      .set({
        sourceVariantRevisionId: source.id,
        version: (locked[0]?.version ?? target.version) + 1,
        updatedAt: new Date(),
      })
      .where(eq(processVariantRevision.id, target.id));

    await writeAuditLog(
      {
        organizationId: context.organizationId,
        actorId: context.userId,
        action: "processVariant.sourceUpdateApplied",
        target: { type: "processVariantRevision", id: target.id },
        metadata: {
          sourceRevisionId: source.id,
          targetRevisionId: target.id,
          applied,
          selections: input.selections,
        },
      },
      tx,
    );

    return { applied };
  });
}
