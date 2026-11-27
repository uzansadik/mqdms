import { canAccess, requireAuthContext } from "@/features/auth/session";
import { FmeaDocumentPanel } from "@/features/fmea/components/fmea-document-panel";
import { getFmeaDocumentListData, requireFmeaAccess } from "@/features/fmea/server";

type PageProps = {
  params: Promise<{ processId: string; variantId: string; revisionId: string }>;
};

/**
 * Revision'daki FMEA belgeleri.
 *
 * FMEA, revision'ın teknik içeriğidir; bu sayfa revision içindeki belge
 * listesini gösterir.
 */
export default async function ProcessVariantRevisionFmeaPage({ params }: PageProps) {
  const context = await requireAuthContext();

  await requireFmeaAccess("read");

  const { processId, variantId, revisionId } = await params;

  const [data, canCreate] = await Promise.all([
    getFmeaDocumentListData(context.organizationId, revisionId),
    canAccess(context, "fmea", "create"),
  ]);

  const baseHref = `/master-processes/${processId}/variants/${variantId}/revisions/${revisionId}/fmea`;

  return (
    <FmeaDocumentPanel
      canCreate={canCreate}
      detailHrefBase={baseHref}
      documents={data.documents}
      revisionId={revisionId}
    />
  );
}
