import { db } from "@mqdms/db";
import { flow, flowEdge, flowNode, processVariantRevisionFlow } from "@mqdms/db/schema";
import { and, asc, eq, inArray } from "drizzle-orm";

import type { FlowEdgeType, FlowNodeType } from "./schema";
import type { GraphEdge, GraphNode } from "./validation";

/**
 * Flow okuma katmanı.
 *
 * Bütün sorgular `organizationId` ile kısıtlanır.
 */

/** Flow kaydı. */
export type FlowRecord = {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  flowType: "PROCESS_VARIANT" | "PROCESS_STEP" | "PROCESS_FLOW";
  createdAt: Date;
  updatedAt: Date;
};

/** Node kaydı. */
export type FlowNodeRecord = {
  id: string;
  organizationId: string;
  flowId: string;
  logicalId: string;
  derivedFromId: string | null;
  nodeType: FlowNodeType;
  title: string;
  description: string | null;
  positionX: string;
  positionY: string;
  width: string;
  height: string;
  config: Record<string, unknown>;
  sortOrder: number;
};

/** Edge kaydı. */
export type FlowEdgeRecord = {
  id: string;
  organizationId: string;
  flowId: string;
  logicalId: string;
  derivedFromId: string | null;
  sourceNodeId: string;
  targetNodeId: string;
  sourceHandle: string | null;
  targetHandle: string | null;
  label: string | null;
  condition: string | null;
  edgeType: FlowEdgeType;
  sortOrder: number;
};

/**
 * Bir revision'ın akışı.
 *
 * Revision başına en fazla bir akış olabilir.
 */
export async function getFlowByRevision(
  organizationId: string,
  revisionId: string,
): Promise<FlowRecord | null> {
  const rows = await db
    .select({
      id: flow.id,
      organizationId: flow.organizationId,
      name: flow.name,
      description: flow.description,
      flowType: flow.flowType,
      createdAt: flow.createdAt,
      updatedAt: flow.updatedAt,
    })
    .from(processVariantRevisionFlow)
    .innerJoin(flow, eq(flow.id, processVariantRevisionFlow.flowId))
    .where(
      and(
        eq(processVariantRevisionFlow.organizationId, organizationId),
        eq(processVariantRevisionFlow.processVariantRevisionId, revisionId),
      ),
    )
    .limit(1);

  return rows[0] ?? null;
}

/** Akışın node'ları. */
export async function listFlowNodes(
  organizationId: string,
  flowId: string,
): Promise<FlowNodeRecord[]> {
  return db
    .select({
      id: flowNode.id,
      organizationId: flowNode.organizationId,
      flowId: flowNode.flowId,
      logicalId: flowNode.logicalId,
      derivedFromId: flowNode.derivedFromId,
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
    .where(and(eq(flowNode.organizationId, organizationId), eq(flowNode.flowId, flowId)))
    .orderBy(asc(flowNode.sortOrder), asc(flowNode.createdAt));
}

/** Akışın edge'leri. */
export async function listFlowEdges(
  organizationId: string,
  flowId: string,
): Promise<FlowEdgeRecord[]> {
  return db
    .select({
      id: flowEdge.id,
      organizationId: flowEdge.organizationId,
      flowId: flowEdge.flowId,
      logicalId: flowEdge.logicalId,
      derivedFromId: flowEdge.derivedFromId,
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
    .where(and(eq(flowEdge.organizationId, organizationId), eq(flowEdge.flowId, flowId)))
    .orderBy(asc(flowEdge.sortOrder), asc(flowEdge.createdAt));
}

/** Akışın node id'leri (akış başına kontrol için). */
export async function listNodeIdsByFlow(organizationId: string, flowId: string): Promise<string[]> {
  const rows = await db
    .select({ id: flowNode.id })
    .from(flowNode)
    .where(and(eq(flowNode.organizationId, organizationId), eq(flowNode.flowId, flowId)));

  return rows.map((row) => row.id);
}

/**
 * Bir node id'si başka bir akışta kullanılıyor mu?
 *
 * İstemciden gelen id'ler güvenilmez: başka bir akışın node'u ile çakışma
 * yazımda engellenir.
 */
export async function findNodeOwnerFlow(
  organizationId: string,
  nodeId: string,
): Promise<string | null> {
  const rows = await db
    .select({ flowId: flowNode.flowId })
    .from(flowNode)
    .where(and(eq(flowNode.organizationId, organizationId), eq(flowNode.id, nodeId)))
    .limit(1);

  return rows[0]?.flowId ?? null;
}

/** Bir edge id'si başka bir akışta kullanılıyor mu? */
export async function findEdgeOwnerFlow(
  organizationId: string,
  edgeId: string,
): Promise<string | null> {
  const rows = await db
    .select({ flowId: flowEdge.flowId })
    .from(flowEdge)
    .where(and(eq(flowEdge.organizationId, organizationId), eq(flowEdge.id, edgeId)))
    .limit(1);

  return rows[0]?.flowId ?? null;
}

/**
 * Bir revision'ın doğrulama için grafiği.
 *
 * Revision'a bağlı akış yoksa `null` döner: akış opsiyonel bir teknik
 * içeriktir, ancak varsa yayınlamadan önce doğrulanmalıdır.
 */
export async function getRevisionGraph(
  organizationId: string,
  revisionId: string,
): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] } | null> {
  const flowRecord = await getFlowByRevision(organizationId, revisionId);

  if (!flowRecord) {
    return null;
  }

  const [nodes, edges] = await Promise.all([
    listFlowNodes(organizationId, flowRecord.id),
    listFlowEdges(organizationId, flowRecord.id),
  ]);

  return {
    nodes: nodes.map((node) => ({
      id: node.id,
      nodeType: node.nodeType,
      title: node.title,
      logicalId: node.logicalId,
    })),
    edges: edges.map((edge) => ({
      id: edge.id,
      sourceNodeId: edge.sourceNodeId,
      targetNodeId: edge.targetNodeId,
      label: edge.label,
      edgeType: edge.edgeType,
    })),
  };
}

/** Node'ların mevcut id'leri (verilen akışta). */
export async function listExistingNodeIds(
  organizationId: string,
  flowId: string,
  nodeIds: string[],
): Promise<string[]> {
  if (nodeIds.length === 0) {
    return [];
  }

  const rows = await db
    .select({ id: flowNode.id })
    .from(flowNode)
    .where(
      and(
        eq(flowNode.organizationId, organizationId),
        eq(flowNode.flowId, flowId),
        inArray(flowNode.id, nodeIds),
      ),
    );

  return rows.map((row) => row.id);
}

/** Edge'lerin mevcut id'leri (verilen akışta). */
export async function listExistingEdgeIds(
  organizationId: string,
  flowId: string,
  edgeIds: string[],
): Promise<string[]> {
  if (edgeIds.length === 0) {
    return [];
  }

  const rows = await db
    .select({ id: flowEdge.id })
    .from(flowEdge)
    .where(
      and(
        eq(flowEdge.organizationId, organizationId),
        eq(flowEdge.flowId, flowId),
        inArray(flowEdge.id, edgeIds),
      ),
    );

  return rows.map((row) => row.id);
}
