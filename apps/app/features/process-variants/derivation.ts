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
  findProcessVariantByCode,
  getProcessVariant,
  getProcessVariantRevision,
} from "./repository";

/**
 * Jenerikten özelleştirilmiş varyanta türetme.
 *
 * Türetme **materialized snapshot** yaklaşımıdır: kaynak revision'ın teknik
 * içeriği yeni kayıtlara kopyalanır. Kopyalanan kayıtların:
 *
 * - `logicalId` değeri korunur (revision'lar boyunca stabil kimlik),
 * - `derivedFromId` değeri doğrudan kaynak kaydı gösterir,
 * - id'leri yeniden üretilir.
 *
 * Böylece türetilen varyant bağımsız olarak düzenlenebilir; jenerik
 * varyantın sonraki değişiklikleri türetilmiş içeriği etkilemez.
 */

/** Türetme hatası. */
export class DerivationRuleError extends Error {
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
    this.name = "DerivationRuleError";
  }
}

/** Aktarılacak teknik içerikler. */
export type DerivationSelections = {
  flow: boolean;
  workElements: boolean;
  functions: boolean;
  requirements: boolean;
  io: boolean;
  applicability: boolean;
};

/** Türetme isteği. */
export type DerivationInput = {
  /** Kaynak revision; yayınlanmış olmalıdır. */
  sourceVariantRevisionId: string;

  /** Yeni varyant kodu. */
  code: string;

  /** Yeni varyant adı. */
  name: string;

  /** Yeni varyant açıklaması. */
  description?: string;

  /** Aktarılacak teknik içerikler. */
  selections: DerivationSelections;
};

/** Türetme sonucu. */
export type DerivationResult = {
  variantId: string;
  revisionId: string;

  /** Kopyalanan kayıt sayıları. */
  copied: {
    nodes: number;
    edges: number;
    workElements: number;
    functions: number;
    requirements: number;
    io: number;
    applicabilities: number;
  };
};

/** Yetki kontrolü. */
async function requireDerivationPermission(context: AuthContext): Promise<void> {
  if (!(await hasPermission(context, "masterProcesses", "derive"))) {
    throw new DerivationRuleError("Bu işlem için yetkiniz yok.", "FORBIDDEN");
  }
}

/** Yeni uuid üretir. */
function newId(): string {
  return crypto.randomUUID();
}

/**
 * Jenerik revision'dan özelleştirilmiş varyant türetir.
 *
 * Yeni varyant ve ilk `DRAFT` revision'ı **tek transaction** içinde oluşturulur.
 */
export async function deriveProcessVariant(
  context: AuthContext,
  input: DerivationInput,
): Promise<DerivationResult> {
  await requireDerivationPermission(context);

  const source = await getProcessVariantRevision(
    context.organizationId,
    input.sourceVariantRevisionId,
  );

  if (!source) {
    throw new DerivationRuleError("Kaynak revision bulunamadı.", "NOT_FOUND");
  }

  if (source.status !== "RELEASED") {
    throw new DerivationRuleError(
      "Yalnızca yayınlanmış revision'dan türetim yapılabilir.",
      "INVALID_STATE",
    );
  }

  const sourceVariant = await getProcessVariant(context.organizationId, source.processVariantId);

  if (!sourceVariant) {
    throw new DerivationRuleError("Kaynak varyant bulunamadı.", "NOT_FOUND");
  }

  const existing = await findProcessVariantByCode(context.organizationId, input.code);

  if (existing) {
    throw new DerivationRuleError("Bu varyant kodu zaten kullanılıyor.", "CONFLICT");
  }

  const copied = {
    nodes: 0,
    edges: 0,
    workElements: 0,
    functions: 0,
    requirements: 0,
    io: 0,
    applicabilities: 0,
  };

  return db.transaction(async (tx) => {
    // 1. Yeni varyant.
    const createdVariant = await tx
      .insert(processVariant)
      .values({
        organizationId: context.organizationId,
        processId: sourceVariant.processId,
        code: input.code,
        name: input.name,
        description: input.description ?? null,
        variantType: "SPECIALIZED",
        status: "ACTIVE",
        createdById: context.userId,
      })
      .returning({ id: processVariant.id });

    const variantId = createdVariant[0]?.id;

    if (!variantId) {
      throw new DerivationRuleError("Varyant oluşturulamadı.", "INVALID_INPUT");
    }

    // 2. Türetilmiş revision (kaynak revision'a bağlı).
    const createdRevision = await tx
      .insert(processVariantRevision)
      .values({
        organizationId: context.organizationId,
        processVariantId: variantId,
        revision: "REV.01",
        description: `Kaynak: ${sourceVariant.code} ${source.revision}`,
        changeReason: "Jenerik varyantan türetildi.",
        status: "DRAFT",
        sourceVariantRevisionId: source.id,
        createdById: context.userId,
      })
      .returning({ id: processVariantRevision.id });

    const revisionId = createdRevision[0]?.id;

    if (!revisionId) {
      throw new DerivationRuleError("Revision oluşturulamadı.", "INVALID_INPUT");
    }

    // 3. Work element'ler.
    const workElementMap = new Map<string, string>();

    if (input.selections.workElements) {
      const sourceWorkElements = await tx
        .select({
          id: processWorkElement.id,
          logicalId: processWorkElement.logicalId,
          code: processWorkElement.code,
          name: processWorkElement.name,
          description: processWorkElement.description,
          category: processWorkElement.category,
          itemId: processWorkElement.itemId,
          itemGroupId: processWorkElement.itemGroupId,
          sortOrder: processWorkElement.sortOrder,
        })
        .from(processWorkElement)
        .where(
          and(
            eq(processWorkElement.organizationId, context.organizationId),
            eq(processWorkElement.processVariantRevisionId, source.id),
          ),
        );

      for (const record of sourceWorkElements) {
        const newWorkElementId = newId();

        workElementMap.set(record.id, newWorkElementId);

        await tx.insert(processWorkElement).values({
          id: newWorkElementId,
          organizationId: context.organizationId,
          processVariantRevisionId: revisionId,
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

        copied.workElements += 1;
      }
    }

    // 4. Flow, node'lar ve edge'ler.
    const nodeMap = new Map<string, string>();

    if (input.selections.flow) {
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

        const flowId = createdFlow[0]?.id;

        if (!flowId) {
          throw new DerivationRuleError("Akış oluşturulamadı.", "INVALID_INPUT");
        }

        await tx.insert(processVariantRevisionFlow).values({
          organizationId: context.organizationId,
          processVariantRevisionId: revisionId,
          flowId,
        });

        const sourceNodes = await tx
          .select({
            id: flowNode.id,
            logicalId: flowNode.logicalId,
            nodeType: flowNode.nodeType,
            title: flowNode.title,
            description: flowNode.description,
            positionX: flowNode.positionX,
            positionY: flowNode.positionY,
            width: flowNode.width,
            height: flowNode.height,
            config: flowNode.config,
            sortOrder: flowNode.sortOrder,
          })
          .from(flowNode)
          .where(
            and(
              eq(flowNode.organizationId, context.organizationId),
              eq(flowNode.flowId, sourceFlow.id),
            ),
          );

        for (const record of sourceNodes) {
          const newNodeId = newId();

          nodeMap.set(record.id, newNodeId);

          await tx.insert(flowNode).values({
            id: newNodeId,
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

          copied.nodes += 1;
        }

        const sourceEdges = await tx
          .select({
            id: flowEdge.id,
            logicalId: flowEdge.logicalId,
            sourceNodeId: flowEdge.sourceNodeId,
            targetNodeId: flowEdge.targetNodeId,
            sourceHandle: flowEdge.sourceHandle,
            targetHandle: flowEdge.targetHandle,
            label: flowEdge.label,
            condition: flowEdge.condition,
            edgeType: flowEdge.edgeType,
            sortOrder: flowEdge.sortOrder,
          })
          .from(flowEdge)
          .where(
            and(
              eq(flowEdge.organizationId, context.organizationId),
              eq(flowEdge.flowId, sourceFlow.id),
            ),
          );

        for (const record of sourceEdges) {
          const newSourceId = nodeMap.get(record.sourceNodeId);
          const newTargetId = nodeMap.get(record.targetNodeId);

          // Kırık referans oluşmaz: eşleşmeyen edge kopyalanmaz.
          if (!newSourceId || !newTargetId) {
            continue;
          }

          await tx.insert(flowEdge).values({
            id: newId(),
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

          copied.edges += 1;
        }

        // Node ↔ work element bağlantıları yalnızca her iki içerik de
        // kopyalandığında taşınır.
        if (input.selections.workElements) {
          const sourceLinks = await tx
            .select({
              id: flowNodeWorkElement.id,
              flowNodeId: flowNodeWorkElement.flowNodeId,
              processWorkElementId: flowNodeWorkElement.processWorkElementId,
              description: flowNodeWorkElement.description,
            })
            .from(flowNodeWorkElement)
            .where(eq(flowNodeWorkElement.organizationId, context.organizationId));

          for (const link of sourceLinks) {
            const newNodeId = nodeMap.get(link.flowNodeId);
            const newWorkElementId = workElementMap.get(link.processWorkElementId);

            if (!newNodeId || !newWorkElementId) {
              continue;
            }

            await tx.insert(flowNodeWorkElement).values({
              organizationId: context.organizationId,
              flowNodeId: newNodeId,
              processWorkElementId: newWorkElementId,
              description: link.description,
            });
          }
        }
      }
    }

    // 5. Gereklilikler.
    const requirementMap = new Map<string, string>();

    if (input.selections.requirements) {
      const sourceRequirements = await tx
        .select({
          id: processRequirement.id,
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
            eq(processRequirement.organizationId, context.organizationId),
            eq(processRequirement.processVariantRevisionId, source.id),
          ),
        );

      for (const record of sourceRequirements) {
        const newRequirementId = newId();

        requirementMap.set(record.id, newRequirementId);

        await tx.insert(processRequirement).values({
          id: newRequirementId,
          organizationId: context.organizationId,
          processVariantRevisionId: revisionId,
          logicalId: record.logicalId,
          derivedFromId: record.id,
          code: record.code,
          name: record.name,
          description: record.description,
          requirementType: record.requirementType,
          sourceReference: record.sourceReference,
          isMandatory: record.isMandatory,
        });

        copied.requirements += 1;
      }
    }

    // 6. Fonksiyonlar.
    const functionMap = new Map<string, string>();

    if (input.selections.functions) {
      const sourceFunctions = await tx
        .select({
          id: processFunction.id,
          logicalId: processFunction.logicalId,
          name: processFunction.name,
          description: processFunction.description,
          functionScope: processFunction.functionScope,
          processWorkElementId: processFunction.processWorkElementId,
        })
        .from(processFunction)
        .where(
          and(
            eq(processFunction.organizationId, context.organizationId),
            eq(processFunction.processVariantRevisionId, source.id),
          ),
        );

      for (const record of sourceFunctions) {
        const newFunctionId = newId();

        functionMap.set(record.id, newFunctionId);

        await tx.insert(processFunction).values({
          id: newFunctionId,
          organizationId: context.organizationId,
          processVariantRevisionId: revisionId,
          logicalId: record.logicalId,
          derivedFromId: record.id,
          name: record.name,
          description: record.description,
          functionScope: record.functionScope,
          // Work element kopyalanmadıysa referans boş bırakılır.
          processWorkElementId: record.processWorkElementId
            ? (workElementMap.get(record.processWorkElementId) ?? null)
            : null,
        });

        copied.functions += 1;
      }

      // Fonksiyon ↔ gereklilik bağlantıları.
      if (input.selections.requirements) {
        const sourceLinks = await tx
          .select({
            id: processFunctionRequirement.id,
            processFunctionId: processFunctionRequirement.processFunctionId,
            processRequirementId: processFunctionRequirement.processRequirementId,
          })
          .from(processFunctionRequirement)
          .where(eq(processFunctionRequirement.organizationId, context.organizationId));

        for (const link of sourceLinks) {
          const newFunctionId = functionMap.get(link.processFunctionId);
          const newRequirementId = requirementMap.get(link.processRequirementId);

          if (!newFunctionId || !newRequirementId) {
            continue;
          }

          await tx.insert(processFunctionRequirement).values({
            organizationId: context.organizationId,
            processFunctionId: newFunctionId,
            processRequirementId: newRequirementId,
          });
        }
      }
    }

    // 7. Node ↔ fonksiyon bağlantıları.
    if (input.selections.flow && input.selections.functions) {
      const sourceLinks = await tx
        .select({
          id: flowNodeFunction.id,
          flowNodeId: flowNodeFunction.flowNodeId,
          processFunctionId: flowNodeFunction.processFunctionId,
        })
        .from(flowNodeFunction)
        .where(eq(flowNodeFunction.organizationId, context.organizationId));

      for (const link of sourceLinks) {
        const newNodeId = nodeMap.get(link.flowNodeId);
        const newFunctionId = functionMap.get(link.processFunctionId);

        if (!newNodeId || !newFunctionId) {
          continue;
        }

        await tx.insert(flowNodeFunction).values({
          organizationId: context.organizationId,
          flowNodeId: newNodeId,
          processFunctionId: newFunctionId,
        });
      }
    }

    // 8. Girdi/çıktı tanımları.
    if (input.selections.io) {
      const sourceIo = await tx
        .select({
          id: processIoDefinition.id,
          logicalId: processIoDefinition.logicalId,
          direction: processIoDefinition.direction,
          resourceType: processIoDefinition.resourceType,
          name: processIoDefinition.name,
          description: processIoDefinition.description,
          itemGroupId: processIoDefinition.itemGroupId,
          itemId: processIoDefinition.itemId,
          processState: processIoDefinition.processState,
          isRequired: processIoDefinition.isRequired,
          sortOrder: processIoDefinition.sortOrder,
        })
        .from(processIoDefinition)
        .where(
          and(
            eq(processIoDefinition.organizationId, context.organizationId),
            eq(processIoDefinition.processVariantRevisionId, source.id),
          ),
        );

      for (const record of sourceIo) {
        await tx.insert(processIoDefinition).values({
          id: newId(),
          organizationId: context.organizationId,
          processVariantRevisionId: revisionId,
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

        copied.io += 1;
      }
    }

    // 9. Applicability kuralları.
    if (input.selections.applicability) {
      const sourceApplicabilities = await tx
        .select({
          id: processVariantApplicability.id,
          logicalId: processVariantApplicability.logicalId,
          name: processVariantApplicability.name,
          description: processVariantApplicability.description,
          supplyType: processVariantApplicability.supplyType,
          joiningMethod: processVariantApplicability.joiningMethod,
          isActive: processVariantApplicability.isActive,
        })
        .from(processVariantApplicability)
        .where(
          and(
            eq(processVariantApplicability.organizationId, context.organizationId),
            eq(processVariantApplicability.processVariantRevisionId, source.id),
          ),
        );

      for (const record of sourceApplicabilities) {
        const newApplicabilityId = newId();

        await tx.insert(processVariantApplicability).values({
          id: newApplicabilityId,
          organizationId: context.organizationId,
          processVariantRevisionId: revisionId,
          logicalId: record.logicalId,
          name: record.name,
          description: record.description,
          supplyType: record.supplyType,
          joiningMethod: record.joiningMethod,
          isActive: record.isActive,
          derivedFromId: record.id,
        });

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

        if (sourceGroups.length > 0) {
          await tx.insert(processVariantApplicabilityItemGroup).values(
            sourceGroups.map((group) => ({
              organizationId: context.organizationId,
              applicabilityId: newApplicabilityId,
              itemGroupId: group.itemGroupId,
              includeDescendants: group.includeDescendants,
            })),
          );
        }

        copied.applicabilities += 1;
      }
    }

    await writeAuditLog(
      {
        organizationId: context.organizationId,
        actorId: context.userId,
        action: "processVariant.derived",
        target: { type: "processVariant", id: variantId },
        metadata: {
          sourceVariantRevisionId: source.id,
          sourceVariantId: sourceVariant.id,
          processVariantRevisionId: revisionId,
          code: input.code,
          name: input.name,
          selections: input.selections,
          copied,
        },
      },
      tx,
    );

    return { variantId, revisionId, copied };
  });
}
