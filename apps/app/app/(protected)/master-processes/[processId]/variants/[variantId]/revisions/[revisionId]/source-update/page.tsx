import { getTranslations } from "@mqdms/i18n/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@mqdms/ui/components/card";
import { notFound } from "next/navigation";

import { canAccess, requireAuthContext } from "@/features/auth/session";
import { SourceUpdatePanel } from "@/features/process-variants/components/source-update-panel";
import {
  getProcessVariantRevisionDetailData,
  requireProcessVariantsAccess,
} from "@/features/process-variants/server";
import { listSourceUpdateCandidates } from "@/features/process-variants/source-update";

type PageProps = {
  params: Promise<{ processId: string; variantId: string; revisionId: string }>;
};

/**
 * Kontrollü kaynak güncelleme ekranı.
 *
 * Varyantın türetildiği kaynak revision görüntülenir; lineage kaynağından
 * sonra yayınlanmış revision'lar karşılaştırılabilir ve seçilen değişiklikler
 * hedef taslak revision'a aktarılabilir.
 *
 * Yayınlanmış revision otomatik değiştirilmez.
 */
export default async function SourceUpdatePage({ params }: PageProps) {
  const context = await requireAuthContext();

  await requireProcessVariantsAccess("read");

  const { revisionId } = await params;

  const data = await getProcessVariantRevisionDetailData(context.organizationId, revisionId);

  if (!data) {
    notFound();
  }

  const t = await getTranslations();

  if (data.revision.status !== "DRAFT") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("processVariants.sourceUpdate.title")}</CardTitle>

          <CardDescription>{t("processVariants.sourceUpdate.readOnly")}</CardDescription>
        </CardHeader>

        <CardContent>
          <p className="text-sm text-muted-foreground">
            {t("processVariants.sourceUpdate.readOnly.description")}
          </p>
        </CardContent>
      </Card>
    );
  }

  const [candidate, canUpdate] = await Promise.all([
    listSourceUpdateCandidates(context.organizationId, revisionId),
    canAccess(context, "processVariants", "update"),
  ]);

  if (!candidate.lineageSource) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("processVariants.sourceUpdate.title")}</CardTitle>

          <CardDescription>{t("processVariants.sourceUpdate.noLineage")}</CardDescription>
        </CardHeader>

        <CardContent>
          <p className="text-sm text-muted-foreground">
            {t("processVariants.sourceUpdate.noLineage.description")}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <SourceUpdatePanel
      canUpdate={canUpdate}
      candidates={candidate.candidates}
      lineageSource={{
        id: candidate.lineageSource.id,
        revision: candidate.lineageSource.revision,
        variantCode: candidate.lineageSource.variantCode,
        variantName: candidate.lineageSource.variantName,
      }}
      targetRevisionId={revisionId}
    />
  );
}
