import { getTranslations } from "@mqdms/i18n/server";
import { Badge } from "@mqdms/ui/components/badge";
import { notFound } from "next/navigation";

import { requireAuthContext } from "@/features/auth/session";
import { FlowPrintProvider } from "@/features/flow-editor/components/flow-print-view";
import { getFlowEditorData } from "@/features/flow-editor/service";
import { requireProcessVariantsAccess } from "@/features/process-variants/server";

type PageProps = {
  params: Promise<{ processId: string; variantId: string; revisionId: string }>;
};

/**
 * Revision akışının salt okunur yazdırma görünümü.
 *
 * Diyagram müşteri dokümanlarına eklenebilmesi için düzenlenebilir olmayan
 * bir görünüm sunar. Yayınlanmış revision'lar da görüntülenebilir.
 */
export default async function FlowPrintPage({ params }: PageProps) {
  const context = await requireAuthContext();

  await requireProcessVariantsAccess("read");

  const { revisionId } = await params;

  const data = await getFlowEditorData(context.organizationId, revisionId);

  if (!data) {
    notFound();
  }

  const t = await getTranslations();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 print:hidden">
        <h1 className="text-2xl font-semibold tracking-tight">{t("flow.print.title")}</h1>

        <Badge variant="outline">{data.revision.revision}</Badge>

        {!data.editable && <Badge variant="secondary">{t("flow.readOnly")}</Badge>}
      </div>

      <style>{`
        @media print {
          body {
            background: #ffffff;
          }

          main {
            padding: 0 !important;
          }

          aside,
          header,
          nav {
            display: none !important;
          }

          .react-flow__minimap,
          .react-flow__controls,
          .react-flow__panel {
            display: none !important;
          }
        }
      `}</style>

      <FlowPrintProvider
        description={data.flow?.description ?? ""}
        edges={data.edges.map((edge) => ({
          id: edge.id,
          source: edge.sourceNodeId,
          target: edge.targetNodeId,
          sourceHandle: edge.sourceHandle ?? undefined,
          targetHandle: edge.targetHandle ?? undefined,
          label: edge.label ?? undefined,
          type: "smoothstep",
          data: {
            logicalId: edge.logicalId,
            edgeType: edge.edgeType,
            condition: edge.condition ?? "",
          },
        }))}
        name={data.flow?.name ?? ""}
        nodes={data.nodes.map((node) => ({
          id: node.id,
          type: "flowNode",
          position: { x: Number(node.positionX), y: Number(node.positionY) },
          width: Number(node.width),
          height: Number(node.height),
          data: {
            logicalId: node.logicalId,
            nodeType: node.nodeType,
            title: node.title,
            description: node.description ?? "",
            config: node.config,
          },
        }))}
      />
    </div>
  );
}
