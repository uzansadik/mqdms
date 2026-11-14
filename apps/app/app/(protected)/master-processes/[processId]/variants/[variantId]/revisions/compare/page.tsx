import { notFound } from "next/navigation";

import { requireAuthContext } from "@/features/auth/session";
import { RevisionComparePicker } from "@/features/process-variants/components/revision-compare-picker";
import { RevisionCompareView } from "@/features/process-variants/components/revision-compare-view";
import {
  getProcessVariantDetailData,
  getRevisionComparisonData,
  requireProcessVariantsAccess,
} from "@/features/process-variants/server";

type PageProps = {
  params: Promise<{ processId: string; variantId: string }>;
  searchParams: Promise<{ from?: string; to?: string }>;
};

/**
 * İki revision'ın karşılaştırma ekranı.
 *
 * `from` ve `to` sorgu parametreleri verilmezse revision seçim ekranı
 * gösterilir. Teknik değişiklikler ve görsel düzen değişiklikleri ayrı
 * listelenir.
 */
export default async function CompareRevisionsPage({ params, searchParams }: PageProps) {
  const context = await requireAuthContext();

  await requireProcessVariantsAccess("compare");

  const { variantId } = await params;
  const { from, to } = await searchParams;

  const data = await getProcessVariantDetailData(context.organizationId, variantId);

  if (!data) {
    notFound();
  }

  const basePath = `/master-processes/${data.variant.processId}/variants/${data.variant.id}`;

  if (!from || !to) {
    return (
      <div className="space-y-6">
        <RevisionComparePicker basePath={basePath} revisions={data.revisions} />
      </div>
    );
  }

  const comparison = await getRevisionComparisonData(context.organizationId, variantId, from, to);

  if (!comparison) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <RevisionCompareView
        from={comparison.from}
        layout={comparison.layout}
        technical={comparison.technical}
        to={comparison.to}
      />
    </div>
  );
}
