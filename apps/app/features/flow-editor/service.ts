import { writeAuditLog } from "@mqdms/audit";
import { type AuthContext, hasPermission } from "@mqdms/auth/permissions/server";
import { db } from "@mqdms/db";
import {
  flow,
  flowEdge,
  flowNode,
  processVariantRevision,
  processVariantRevisionFlow,
} from "@mqdms/db/schema";
import { and, eq, inArray } from "drizzle-orm";

import { getProcessVariantRevision } from "@/features/process-variants/repository";

import {
  type FlowEdgeRecord,
  type FlowNodeRecord,
  type FlowRecord,
  getFlowByRevision,
  listFlowEdges,
  listFlowNodes,
} from "./repository";
import type { FlowSaveInput } from "./schema";
import { validateGraph } from "./validation";

/**
 * Flow editörü servisi.
 *
 * Akış bir Process Variant Revision'a aittir ve **yalnızca taslak**
 * revision'da düzenlenebilir. Kaydetme işlemi tek transaction içinde yapılır:
 * akış meta verisi, node'lar, edge'ler ve revision sürümü birlikte yazılır.
 */

/** İş kuralı ihlali. */
export class FlowRuleError extends Error {
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
    this.name = "FlowRuleError";
  }
}

/** Yetki kontrolü. */
async function requireFlowPermission(context: AuthContext, action: string): Promise<void> {
  if (!(await hasPermission(context, "processVariants", action))) {
    throw new FlowRuleError("Bu işlem için yetkiniz yok.", "FORBIDDEN");
  }
}

/** Editörün yüklediği veri. */
export type FlowEditorData = {
  revision: {
    id: string;
    revision: string;
    status: "DRAFT" | "IN_REVIEW" | "APPROVED" | "RELEASED" | "SUPERSEDED";
    version: number;
  };

  flow: FlowRecord | null;
  nodes: FlowNodeRecord[];
  edges: FlowEdgeRecord[];

  /** Akış yalnızca taslak revision'da düzenlenebilir. */
  editable: boolean;
};

/** Editör verisini yükler. */
export async function getFlowEditorData(
  organizationId: string,
  revisionId: string,
): Promise<FlowEditorData | null> {
  const revision = await getProcessVariantRevision(organizationId, revisionId);

  if (!revision) {
    return null;
  }

  const flowRecord = await getFlowByRevision(organizationId, revisionId);

  if (!flowRecord) {
    return {
      revision: {
        id: revision.id,
        revision: revision.revision,
        status: revision.status,
        version: revision.version,
      },
      flow: null,
      nodes: [],
      edges: [],
      editable: revision.status === "DRAFT",
    };
  }

  const [nodes, edges] = await Promise.all([
    listFlowNodes(organizationId, flowRecord.id),
    listFlowEdges(organizationId, flowRecord.id),
  ]);

  return {
    revision: {
      id: revision.id,
      revision: revision.revision,
      status: revision.status,
      version: revision.version,
    },
    flow: flowRecord,
    nodes,
    edges,
    editable: revision.status === "DRAFT",
  };
}

/**
 * Grafiği kaydeder.
 *
 * Kaydetme sırasında revision durumu **yeniden doğrulanır** ve sürüm
 * karşılaştırılır: başka bir kullanıcı revision'ı değiştirdiyse eski edit
 * ekranından gelen kayıt reddedilir.
 */
export async function saveFlowGraph(
  context: AuthContext,
  input: FlowSaveInput,
): Promise<{ nodeCount: number; edgeCount: number; version: number }> {
  await requireFlowPermission(context, "update");

  const validation = validateGraph(
    input.graph.nodes.map((node) => ({
      id: node.id,
      nodeType: node.nodeType,
      title: node.title,
      logicalId: node.logicalId,
    })),
    input.graph.edges.map((edge) => ({
      id: edge.id,
      sourceNodeId: edge.sourceNodeId,
      targetNodeId: edge.targetNodeId,
      label: edge.label ?? null,
      edgeType: edge.edgeType,
    })),
  );

  if (validation.errors.length > 0) {
    throw new FlowRuleError(`Akış geçersiz: ${validation.errors.join(", ")}`, "INVALID_INPUT");
  }

  return db.transaction(async (tx) => {
    /*
     * Revision satırı kilitlenir: eşzamanlı iki kayıt birbirinin
     * değişikliklerini ezemez.
     */
    const revisionRows = await tx
      .select({
        id: processVariantRevision.id,
        status: processVariantRevision.status,
        version: processVariantRevision.version,
      })
      .from(processVariantRevision)
      .where(
        and(
          eq(processVariantRevision.organizationId, context.organizationId),
          eq(processVariantRevision.id, input.revisionId),
        ),
      )
      .for("update")
      .limit(1);

    const revision = revisionRows[0];

    if (!revision) {
      throw new FlowRuleError("Revision bulunamadı.", "NOT_FOUND");
    }

    if (revision.status !== "DRAFT") {
      throw new FlowRuleError("Yayınlanmış revision'ın akışı düzenlenemez.", "INVALID_STATE");
    }

    if (revision.version !== input.expectedVersion) {
      throw new FlowRuleError(
        "Revision başka bir kullanıcı tarafından değiştirildi. Sayfayı yenileyin.",
        "CONFLICT",
      );
    }

    // Akış: yoksa oluşturulur.
    const flowRows = await tx
      .select({ id: flow.id })
      .from(processVariantRevisionFlow)
      .innerJoin(flow, eq(flow.id, processVariantRevisionFlow.flowId))
      .where(
        and(
          eq(processVariantRevisionFlow.organizationId, context.organizationId),
          eq(processVariantRevisionFlow.processVariantRevisionId, input.revisionId),
        ),
      )
      .limit(1);

    let flowId = flowRows[0]?.id;

    if (!flowId) {
      const createdFlow = await tx
        .insert(flow)
        .values({
          organizationId: context.organizationId,
          name: input.graph.name,
          description: input.graph.description || null,
          flowType: "PROCESS_VARIANT",
          createdById: context.userId,
        })
        .returning({ id: flow.id });

      flowId = createdFlow[0]?.id;

      if (!flowId) {
        throw new FlowRuleError("Akış oluşturulamadı.", "INVALID_INPUT");
      }

      await tx.insert(processVariantRevisionFlow).values({
        organizationId: context.organizationId,
        processVariantRevisionId: input.revisionId,
        flowId,
      });
    }

    // Mevcut node ve edge id'leri.
    const existingNodes = await tx
      .select({ id: flowNode.id })
      .from(flowNode)
      .where(and(eq(flowNode.organizationId, context.organizationId), eq(flowNode.flowId, flowId)));

    const existingNodeIds = new Set(existingNodes.map((row) => row.id));

    const existingEdges = await tx
      .select({ id: flowEdge.id })
      .from(flowEdge)
      .where(and(eq(flowEdge.organizationId, context.organizationId), eq(flowEdge.flowId, flowId)));

    const existingEdgeIds = new Set(existingEdges.map((row) => row.id));

    /*
     * İstemciden gelen id'ler başka bir akışa ait olamaz: kimlik çakışması
     * yazımda değil, burada engellenir.
     */
    const incomingNodeIds = input.graph.nodes.map((node) => node.id);
    const incomingEdgeIds = input.graph.edges.map((edge) => edge.id);

    if (incomingNodeIds.length > 0) {
      const foreignNodes = await tx
        .select({ id: flowNode.id })
        .from(flowNode)
        .where(
          and(
            eq(flowNode.organizationId, context.organizationId),
            inArray(flowNode.id, incomingNodeIds),
          ),
        );

      for (const row of foreignNodes) {
        if (!existingNodeIds.has(row.id)) {
          throw new FlowRuleError("Bir node kimliği başka bir akışa ait.", "INVALID_INPUT");
        }
      }
    }

    if (incomingEdgeIds.length > 0) {
      const foreignEdges = await tx
        .select({ id: flowEdge.id })
        .from(flowEdge)
        .where(
          and(
            eq(flowEdge.organizationId, context.organizationId),
            inArray(flowEdge.id, incomingEdgeIds),
          ),
        );

      for (const row of foreignEdges) {
        if (!existingEdgeIds.has(row.id)) {
          throw new FlowRuleError("Bir bağlantı kimliği başka bir akışa ait.", "INVALID_INPUT");
        }
      }
    }

    // Node'lar yazılır.
    const keptNodeIds = new Set<string>();

    for (const [index, node] of input.graph.nodes.entries()) {
      keptNodeIds.add(node.id);

      const values = {
        logicalId: node.logicalId,
        nodeType: node.nodeType,
        title: node.title,
        description: node.description || null,
        positionX: String(node.positionX),
        positionY: String(node.positionY),
        width: String(node.width ?? 180),
        height: String(node.height ?? 72),
        config: node.config ?? {},
        sortOrder: node.sortOrder ?? index,
      };

      if (existingNodeIds.has(node.id)) {
        await tx
          .update(flowNode)
          .set(values)
          .where(
            and(eq(flowNode.organizationId, context.organizationId), eq(flowNode.id, node.id)),
          );
      } else {
        await tx.insert(flowNode).values({
          id: node.id,
          organizationId: context.organizationId,
          flowId,
          ...values,
        });
      }
    }

    // Silinen node'lar: bağlantıları da silinir (cascade).
    const removedNodeIds = [...existingNodeIds].filter((id) => !keptNodeIds.has(id));

    if (removedNodeIds.length > 0) {
      await tx
        .delete(flowNode)
        .where(
          and(
            eq(flowNode.organizationId, context.organizationId),
            eq(flowNode.flowId, flowId),
            inArray(flowNode.id, removedNodeIds),
          ),
        );
    }

    // Edge'ler yazılır.
    const keptEdgeIds = new Set<string>();

    for (const [index, edge] of input.graph.edges.entries()) {
      keptEdgeIds.add(edge.id);

      const values = {
        logicalId: edge.logicalId,
        sourceNodeId: edge.sourceNodeId,
        targetNodeId: edge.targetNodeId,
        sourceHandle: edge.sourceHandle ?? null,
        targetHandle: edge.targetHandle ?? null,
        label: edge.label ?? null,
        condition: edge.condition ?? null,
        edgeType: edge.edgeType,
        sortOrder: edge.sortOrder ?? index,
      };

      if (existingEdgeIds.has(edge.id)) {
        await tx
          .update(flowEdge)
          .set(values)
          .where(
            and(eq(flowEdge.organizationId, context.organizationId), eq(flowEdge.id, edge.id)),
          );
      } else {
        await tx.insert(flowEdge).values({
          id: edge.id,
          organizationId: context.organizationId,
          flowId,
          ...values,
        });
      }
    }

    // Silinen edge'ler.
    const removedEdgeIds = [...existingEdgeIds].filter((id) => !keptEdgeIds.has(id));

    if (removedEdgeIds.length > 0) {
      await tx
        .delete(flowEdge)
        .where(
          and(
            eq(flowEdge.organizationId, context.organizationId),
            eq(flowEdge.flowId, flowId),
            inArray(flowEdge.id, removedEdgeIds),
          ),
        );
    }

    // Akış meta verisi.
    await tx
      .update(flow)
      .set({ name: input.graph.name, description: input.graph.description || null })
      .where(and(eq(flow.organizationId, context.organizationId), eq(flow.id, flowId)));

    // Revision sürümü artar: bir sonraki kayıt eski sürümle gelirse reddedilir.
    const nextVersion = revision.version + 1;

    await tx
      .update(processVariantRevision)
      .set({ version: nextVersion })
      .where(
        and(
          eq(processVariantRevision.organizationId, context.organizationId),
          eq(processVariantRevision.id, input.revisionId),
        ),
      );

    await writeAuditLog(
      {
        organizationId: context.organizationId,
        actorId: context.userId,
        action: "flow.saved",
        target: { type: "flow", id: flowId },
        metadata: {
          processVariantRevisionId: input.revisionId,
          nodeCount: input.graph.nodes.length,
          edgeCount: input.graph.edges.length,
          warnings: validation.warnings.length,
        },
      },
      tx,
    );

    return {
      nodeCount: input.graph.nodes.length,
      edgeCount: input.graph.edges.length,
      version: nextVersion,
    };
  });
}
