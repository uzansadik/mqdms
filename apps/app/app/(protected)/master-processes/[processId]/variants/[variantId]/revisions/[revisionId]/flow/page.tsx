import { getTranslations } from "@mqdms/i18n/server";
import { Badge } from "@mqdms/ui/components/badge";
import Link from "next/link";
import { notFound } from "next/navigation";

import { requireAuthContext } from "@/features/auth/session";
import { FlowEditorProvider } from "@/features/flow-editor/components/flow-editor";
import { getFlowEditorData } from "@/features/flow-editor/service";
import { requireProcessVariantsAccess } from "@/features/process-variants/server";

type PageProps = {
  params: Promise<{ processId: string; variantId: string; revisionId: string }>;
};

/**
 * Revision akış editörü.
 *
 * Editör yalnızca taslak revision'da düzenlenebilir; yayınlanmış akış
 * görüntülenir ama değiştirilemez.
 */
export default async function FlowEditorPage({ params }: PageProps) {
  const context = await requireAuthContext();

  await requireProcessVariantsAccess("read");

  const { processId, variantId, revisionId } = await params;

  const data = await getFlowEditorData(context.organizationId, revisionId);

  if (!data) {
    notFound();
  }

  const t = await getTranslations();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{t("flow.title")}</h1>

            <Badge variant="outline">{data.revision.revision}</Badge>

            {!data.editable && <Badge variant="secondary">{t("flow.readOnly")}</Badge>}
          </div>

          <p className="mt-1 text-sm text-muted-foreground">
            <Link
              className="hover:underline"
              href={`/master-processes/${processId}/variants/${variantId}/revisions/${revisionId}`}
            >
              {t("flow.backToRevision")}
            </Link>
          </p>
        </div>
      </div>

      <FlowEditorProvider
        initialData={{
          revisionId: data.revision.id,
          revision: data.revision.revision,
          version: data.revision.version,
          editable: data.editable,
          printHref: `/master-processes/${processId}/variants/${variantId}/revisions/${revisionId}/flow/print`,
          name: data.flow?.name ?? "",
          description: data.flow?.description ?? "",
          nodes: data.nodes.map((node) => ({
            id: node.id,
            logicalId: node.logicalId,
            nodeType: node.nodeType,
            title: node.title,
            description: node.description ?? "",
            positionX: Number(node.positionX),
            positionY: Number(node.positionY),
            width: Number(node.width),
            height: Number(node.height),
            config: node.config,
          })),
          edges: data.edges.map((edge) => ({
            id: edge.id,
            logicalId: edge.logicalId,
            sourceNodeId: edge.sourceNodeId,
            targetNodeId: edge.targetNodeId,
            sourceHandle: edge.sourceHandle,
            targetHandle: edge.targetHandle,
            label: edge.label,
            condition: edge.condition,
            edgeType: edge.edgeType,
          })),
        }}
      />
    </div>
  );
}
