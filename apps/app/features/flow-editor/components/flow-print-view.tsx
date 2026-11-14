"use client";

import { useI18n } from "@mqdms/i18n";
import { Button } from "@mqdms/ui/components/button";
import {
  Background,
  BackgroundVariant,
  type Edge,
  MiniMap,
  type Node,
  ReactFlow,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useRouter } from "next/navigation";

import { FlowNodeCard } from "./flow-node-card";

/** Yazdırma görünümündeki node tipi. */
type PrintNode = Node<{
  logicalId: string;
  nodeType: string;
  title: string;
  description: string;
  config: Record<string, unknown>;
}>;

type PrintEdge = Edge<{ logicalId?: string; edgeType?: string; condition?: string }>;

const nodeTypes = { flowNode: FlowNodeCard };

type FlowPrintViewProps = {
  /** Akış adı. */
  name: string;

  /** Akış açıklaması. */
  description: string;

  /** Node'lar. */
  nodes: PrintNode[];

  /** Edge'ler. */
  edges: PrintEdge[];
};

/**
 * Salt okunur yazdırma görünümü.
 *
 * Diyagram müşteri dokümanlarına eklenebilmesi için düzenlenebilir olmayan
 * bir görünüm sunar. Tarayıcının "Yazdır → PDF olarak kaydet" komutuyla çıktı
 * alınabilir.
 */
export function FlowPrintView({ name, description, nodes, edges }: FlowPrintViewProps) {
  const router = useRouter();
  const { t } = useI18n();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 print:hidden">
        <p className="text-sm text-muted-foreground">{t("flow.print.hint")}</p>

        <div className="flex gap-2">
          <Button onClick={() => router.back()} size="sm" type="button" variant="outline">
            {t("flow.print.back")}
          </Button>

          <Button onClick={() => window.print()} size="sm" type="button">
            {t("flow.export.print")}
          </Button>
        </div>
      </div>

      <div className="rounded-lg border bg-white print:border-0">
        <div className="border-b px-4 py-3">
          <h1 className="text-lg font-semibold tracking-tight">{name || t("flow.title")}</h1>

          {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
        </div>

        <div className="h-[28rem] print:h-auto print:min-h-[18rem]">
          <ReactFlow
            edges={edges}
            elementsSelectable={false}
            fitView
            fitViewOptions={{ padding: 0.15 }}
            nodeTypes={nodeTypes}
            nodes={nodes}
            nodesConnectable={false}
            nodesDraggable={false}
            panOnScroll={false}
            zoomOnScroll={false}
          >
            <Background variant={BackgroundVariant.Dots} />
            <MiniMap pannable={false} zoomable={false} />
          </ReactFlow>
        </div>
      </div>
    </div>
  );
}

/** Yazdırma görünümünün sağlayıcı sarmalayıcısı. */
export function FlowPrintProvider(props: FlowPrintViewProps) {
  return (
    <ReactFlowProvider>
      <FlowPrintView {...props} />
    </ReactFlowProvider>
  );
}
