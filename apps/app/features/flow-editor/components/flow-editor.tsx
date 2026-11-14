"use client";

import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  BackgroundVariant,
  type Connection,
  Controls,
  type Edge,
  type EdgeChange,
  MiniMap,
  type Node,
  type NodeChange,
  ReactFlow,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useI18n } from "@mqdms/i18n";
import { Button } from "@mqdms/ui/components/button";
import { Card, CardContent } from "@mqdms/ui/components/card";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { saveFlowGraphAction } from "../actions";
import type { FlowEdgeType, FlowNodeType } from "../schema";
import { FlowInspector, type SelectedEdge, type SelectedNode } from "./flow-inspector";
import { FlowNodeCard } from "./flow-node-card";
import { FlowNodePalette } from "./flow-node-palette";

/** Editörün node verisi. */
type EditorNodeData = {
  logicalId: string;
  nodeType: FlowNodeType;
  title: string;
  description: string;
  config: Record<string, unknown>;
};

/** Editörün edge verisi. */
type EditorEdgeData = {
  logicalId?: string;
  edgeType?: FlowEdgeType;
  condition?: string;
};

type EditorNode = Node<EditorNodeData, "flowNode">;
type EditorEdge = Edge<EditorEdgeData>;

const nodeTypes = { flowNode: FlowNodeCard };

/** Editörün başlangıç verisi. */
export type FlowEditorInitialData = {
  revisionId: string;
  revision: string;
  version: number;
  editable: boolean;

  name: string;
  description: string;

  nodes: {
    id: string;
    logicalId: string;
    nodeType: FlowNodeType;
    title: string;
    description: string;
    positionX: number;
    positionY: number;
    width: number;
    height: number;
    config: Record<string, unknown>;
  }[];

  edges: {
    id: string;
    logicalId: string;
    sourceNodeId: string;
    targetNodeId: string;
    sourceHandle: string | null;
    targetHandle: string | null;
    label: string | null;
    condition: string | null;
    edgeType: FlowEdgeType;
  }[];
};

/** Grafiğin bir anlık görüntüsü (undo/redo için). */
type GraphSnapshot = { nodes: EditorNode[]; edges: EditorEdge[] };

/** Yeni uuid üretir. */
function newId(): string {
  return crypto.randomUUID();
}

/**
 * Flow editörü.
 *
 * Diyagram bir proses tasarım ve dokümantasyon aracıdır: node ve edge
 * kayıtları yalnızca dokümante edilir, hiçbir iş akışı çalıştırılmaz.
 */
export function FlowEditor({ initialData }: { initialData: FlowEditorInitialData }) {
  const router = useRouter();
  const { t } = useI18n();

  const [nodes, setNodes] = useState<EditorNode[]>(() =>
    initialData.nodes.map((node) => ({
      id: node.id,
      type: "flowNode",
      position: { x: node.positionX, y: node.positionY },
      width: node.width,
      height: node.height,
      data: {
        logicalId: node.logicalId,
        nodeType: node.nodeType,
        title: node.title,
        description: node.description,
        config: node.config,
      },
    })),
  );

  const [edges, setEdges] = useState<EditorEdge[]>(() =>
    initialData.edges.map((edge) => ({
      id: edge.id,
      source: edge.sourceNodeId,
      target: edge.targetNodeId,
      sourceHandle: edge.sourceHandle ?? undefined,
      targetHandle: edge.targetHandle ?? undefined,
      label: edge.label ?? undefined,
      data: {
        logicalId: edge.logicalId,
        edgeType: edge.edgeType,
        condition: edge.condition ?? "",
      },
    })),
  );

  const [name, setName] = useState(initialData.name);
  const [description, setDescription] = useState(initialData.description);
  const [version, setVersion] = useState(initialData.version);
  const [isDirty, setIsDirty] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [history, setHistory] = useState<GraphSnapshot[]>([]);
  const [future, setFuture] = useState<GraphSnapshot[]>([]);

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);

  const wrapper = useRef<HTMLDivElement>(null);

  const editable = initialData.editable;

  /** Mevcut durumu geçmişe ekler (undo için). */
  const snapshot = useCallback(() => {
    setHistory((current) => [...current.slice(-49), { nodes, edges }]);
    setFuture([]);
  }, [nodes, edges]);

  function onNodesChange(changes: NodeChange<EditorNode>[]) {
    setNodes((current) => applyNodeChanges(changes, current));
  }

  function onEdgesChange(changes: EdgeChange<EditorEdge>[]) {
    setEdges((current) => applyEdgeChanges(changes, current));
  }

  function onConnect(connection: Connection) {
    if (!editable) {
      return;
    }

    snapshot();

    const edgeType: FlowEdgeType =
      connection.sourceHandle === "no"
        ? "NO"
        : connection.sourceHandle === "yes"
          ? "YES"
          : "DEFAULT";

    setEdges((current) =>
      addEdge(
        {
          ...connection,
          id: newId(),
          type: "smoothstep",
          data: { logicalId: newId(), edgeType, condition: "" },
        },
        current,
      ),
    );

    setIsDirty(true);
  }

  function onNodeDragStop() {
    if (!editable) {
      return;
    }

    snapshot();
    setIsDirty(true);
  }

  function onNodesDelete(deleted: EditorNode[]) {
    if (!editable || deleted.length === 0) {
      return;
    }

    snapshot();
    setEdges((current) =>
      current.filter(
        (edge) => !deleted.some((node) => node.id === edge.source || node.id === edge.target),
      ),
    );
    setIsDirty(true);
  }

  function onEdgesDelete(deleted: EditorEdge[]) {
    if (!editable || deleted.length === 0) {
      return;
    }

    snapshot();
    setIsDirty(true);
  }

  /** Paletten node ekler. */
  function addNode(nodeType: FlowNodeType, position: { x: number; y: number }) {
    if (!editable) {
      return;
    }

    snapshot();

    setNodes((current) => [
      ...current,
      {
        id: newId(),
        type: "flowNode",
        position,
        data: {
          logicalId: newId(),
          nodeType,
          title: t(`flow.nodeTypes.${nodeType}`),
          description: "",
          config: {},
        },
      },
    ]);

    setIsDirty(true);
  }

  function onDragStart(nodeType: FlowNodeType) {
    if (!wrapper.current) {
      return;
    }

    wrapper.current.dataset.dragType = nodeType;
  }

  function onDrop(event: React.DragEvent) {
    event.preventDefault();

    const nodeType = wrapper.current?.dataset.dragType as FlowNodeType | undefined;

    if (!nodeType || !wrapper.current) {
      return;
    }

    const bounds = wrapper.current.getBoundingClientRect();

    addNode(nodeType, {
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    });
  }

  function updateNode(id: string, patch: Partial<SelectedNode>) {
    snapshot();

    setNodes((current) =>
      current.map((node) =>
        node.id === id
          ? {
              ...node,
              data: {
                ...node.data,
                ...(patch.title !== undefined ? { title: patch.title } : {}),
                ...(patch.description !== undefined ? { description: patch.description } : {}),
                ...(patch.nodeType !== undefined ? { nodeType: patch.nodeType } : {}),
              },
            }
          : node,
      ),
    );

    setIsDirty(true);
  }

  function updateEdge(id: string, patch: Partial<SelectedEdge>) {
    snapshot();

    setEdges((current) =>
      current.map((edge) =>
        edge.id === id
          ? {
              ...edge,
              label: patch.label !== undefined ? patch.label : edge.label,
              data: {
                ...edge.data,
                ...(patch.edgeType !== undefined ? { edgeType: patch.edgeType } : {}),
                ...(patch.condition !== undefined ? { condition: patch.condition } : {}),
              },
            }
          : edge,
      ),
    );

    setIsDirty(true);
  }

  function deleteItem(id: string, kind: "node" | "edge") {
    snapshot();

    if (kind === "node") {
      setNodes((current) => current.filter((node) => node.id !== id));
      setEdges((current) => current.filter((edge) => edge.source !== id && edge.target !== id));
    } else {
      setEdges((current) => current.filter((edge) => edge.id !== id));
    }

    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    setIsDirty(true);
  }

  function undo() {
    const previous = history[history.length - 1];

    if (!previous) {
      return;
    }

    setFuture((current) => [{ nodes, edges }, ...current]);
    setHistory((current) => current.slice(0, -1));
    setNodes(previous.nodes);
    setEdges(previous.edges);
    setIsDirty(true);
  }

  function redo() {
    const next = future[0];

    if (!next) {
      return;
    }

    setHistory((current) => [...current, { nodes, edges }]);
    setFuture((current) => current.slice(1));
    setNodes(next.nodes);
    setEdges(next.edges);
    setIsDirty(true);
  }

  /* Klavye kısayolları: Ctrl+Z geri al, Ctrl+Y yinele. */
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!(event.ctrlKey || event.metaKey)) {
        return;
      }

      const key = event.key.toLowerCase();

      if (key === "z" && !event.shiftKey) {
        event.preventDefault();
        undo();
        return;
      }

      if (key === "y" || (key === "z" && event.shiftKey)) {
        event.preventDefault();
        redo();
      }
    }

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  });

  const selectedNode = useMemo<SelectedNode | null>(() => {
    const node = nodes.find((entry) => entry.id === selectedNodeId);

    if (!node) {
      return null;
    }

    return {
      id: node.id,
      nodeType: node.data.nodeType,
      title: node.data.title,
      description: node.data.description,
    };
  }, [nodes, selectedNodeId]);

  const selectedEdge = useMemo<SelectedEdge | null>(() => {
    const edge = edges.find((entry) => entry.id === selectedEdgeId);

    if (!edge) {
      return null;
    }

    return {
      id: edge.id,
      edgeType: edge.data?.edgeType ?? "DEFAULT",
      label: typeof edge.label === "string" ? edge.label : "",
      condition: edge.data?.condition ?? "",
    };
  }, [edges, selectedEdgeId]);

  function save() {
    startTransition(async () => {
      const result = await saveFlowGraphAction({
        revisionId: initialData.revisionId,
        expectedVersion: version,
        graph: {
          name,
          description,
          nodes: nodes.map((node) => ({
            id: node.id,
            logicalId: node.data.logicalId,
            nodeType: node.data.nodeType,
            title: node.data.title,
            description: node.data.description,
            positionX: node.position.x,
            positionY: node.position.y,
            width: node.width ?? undefined,
            height: node.height ?? undefined,
            config: node.data.config ?? {},
          })),
          edges: edges.map((edge) => ({
            id: edge.id,
            logicalId: edge.data?.logicalId ?? edge.id,
            sourceNodeId: edge.source,
            targetNodeId: edge.target,
            sourceHandle: edge.sourceHandle ?? null,
            targetHandle: edge.targetHandle ?? null,
            label: typeof edge.label === "string" ? edge.label : null,
            condition: edge.data?.condition || null,
            edgeType: edge.data?.edgeType ?? "DEFAULT",
          })),
        },
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      setVersion(result.version);
      setIsDirty(false);
      setHistory([]);
      setFuture([]);

      toast.success(t("flow.actions.saved"));

      router.refresh();
    });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="space-y-3">
        <Card>
          <CardContent className="space-y-3 pt-6">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground" htmlFor="flow-name">
                  {t("flow.fields.name")}
                </label>

                <input
                  className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"
                  disabled={!editable}
                  id="flow-name"
                  onChange={(event) => {
                    setName(event.target.value);
                    setIsDirty(true);
                  }}
                  value={name}
                />
              </div>

              <div className="space-y-1">
                <label
                  className="text-xs font-medium text-muted-foreground"
                  htmlFor="flow-description"
                >
                  {t("flow.fields.description")}
                </label>

                <input
                  className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"
                  disabled={!editable}
                  id="flow-description"
                  onChange={(event) => {
                    setDescription(event.target.value);
                    setIsDirty(true);
                  }}
                  value={description}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <FlowNodePalette onDragStart={onDragStart} />

              <div className="flex gap-2">
                <Button
                  disabled={!editable || history.length === 0}
                  onClick={undo}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  {t("flow.actions.undo")}
                </Button>

                <Button
                  disabled={!editable || future.length === 0}
                  onClick={redo}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  {t("flow.actions.redo")}
                </Button>

                <Button disabled={!editable || isPending} onClick={save} size="sm" type="button">
                  {t("flow.actions.save")}
                </Button>
              </div>
            </div>

            {isDirty && <p className="text-xs text-muted-foreground">{t("flow.unsavedWarning")}</p>}
          </CardContent>
        </Card>

        <div
          className="h-[32rem] overflow-hidden rounded-lg border"
          onDragOver={(event) => event.preventDefault()}
          onDrop={onDrop}
          ref={wrapper}
          role="application"
        >
          <ReactFlow
            edges={edges}
            elementsSelectable={editable}
            fitView
            nodeTypes={nodeTypes}
            nodes={nodes}
            nodesConnectable={editable}
            nodesDraggable={editable}
            onConnect={onConnect}
            onEdgeClick={(_, edge) => {
              setSelectedEdgeId(edge.id);
              setSelectedNodeId(null);
            }}
            onEdgesChange={onEdgesChange}
            onEdgesDelete={onEdgesDelete}
            onNodeClick={(_, node) => {
              setSelectedNodeId(node.id);
              setSelectedEdgeId(null);
            }}
            onNodeDragStop={onNodeDragStop}
            onNodesChange={onNodesChange}
            onNodesDelete={onNodesDelete}
            onPaneClick={() => {
              setSelectedNodeId(null);
              setSelectedEdgeId(null);
            }}
          >
            <Background variant={BackgroundVariant.Dots} />
            <Controls />
            <MiniMap pannable zoomable />
          </ReactFlow>
        </div>
      </div>

      <FlowInspector
        edge={selectedEdge}
        node={selectedNode}
        onDelete={deleteItem}
        onEdgeChange={updateEdge}
        onNodeChange={updateNode}
      />
    </div>
  );
}

/**
 * Flow editörünün sağlayıcı sarmalayıcısı.
 *
 * React Flow, sağlayıcısız kullanıldığında bazı özelliklerini kaybeder.
 */
export function FlowEditorProvider({ initialData }: { initialData: FlowEditorInitialData }) {
  return (
    <ReactFlowProvider>
      <FlowEditor initialData={initialData} />
    </ReactFlowProvider>
  );
}
