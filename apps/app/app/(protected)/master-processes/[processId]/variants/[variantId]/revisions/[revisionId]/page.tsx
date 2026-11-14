import { getTranslations } from "@mqdms/i18n/server";
import { Badge } from "@mqdms/ui/components/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@mqdms/ui/components/card";
import Link from "next/link";
import { notFound } from "next/navigation";

import { canAccess, requireAuthContext } from "@/features/auth/session";
import { ProcessVariantRevisionActions } from "@/features/process-variants/components/process-variant-revision-actions";
import {
  getProcessVariantRevisionDetailData,
  requireProcessVariantsAccess,
} from "@/features/process-variants/server";

type PageProps = {
  params: Promise<{ processId: string; variantId: string; revisionId: string }>;
};

/**
 * Process Variant Revision detayı.
 *
 * Revision yaşam döngüsü eylemleri buradan yürütülür: incelemeye gönderme,
 * onaylama, gerekçeli geri alma ve yayınlama.
 */
export default async function ProcessVariantRevisionPage({ params }: PageProps) {
  const context = await requireAuthContext();

  await requireProcessVariantsAccess("read");

  const { revisionId } = await params;

  const data = await getProcessVariantRevisionDetailData(context.organizationId, revisionId);

  if (!data) {
    notFound();
  }

  const [canSubmit, canApprove, canRelease, canReject] = await Promise.all([
    canAccess(context, "processVariants", "submit"),
    canAccess(context, "processVariants", "approve"),
    canAccess(context, "processVariants", "release"),
    canAccess(context, "processVariants", "reject"),
  ]);

  const t = await getTranslations();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{data.revision.revision}</h1>

            <Badge
              variant={
                data.revision.status === "RELEASED"
                  ? "default"
                  : data.revision.status === "DRAFT"
                    ? "secondary"
                    : "outline"
              }
            >
              {t(`processVariants.revisions.status.${data.revision.status}`)}
            </Badge>
          </div>

          <p className="mt-1 text-sm text-muted-foreground">
            <Link
              className="hover:underline"
              href={`/master-processes/${data.variant.processId}/variants/${data.variant.id}`}
            >
              {data.variant.code} · {data.variant.name}
            </Link>
          </p>
        </div>

        <ProcessVariantRevisionActions
          canApprove={canApprove}
          canRelease={canRelease}
          canReject={canReject}
          canSubmit={canSubmit}
          revisionId={data.revision.id}
          status={data.revision.status}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("processVariants.detail.revision.title")}</CardTitle>
        </CardHeader>

        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-muted-foreground">
                {t("processVariants.revisions.form.revision.label")}
              </dt>

              <dd className="text-sm">{data.revision.revision}</dd>
            </div>

            <div>
              <dt className="text-sm text-muted-foreground">
                {t("processVariants.revisions.columns.status")}
              </dt>

              <dd className="text-sm">
                {t(`processVariants.revisions.status.${data.revision.status}`)}
              </dd>
            </div>

            <div>
              <dt className="text-sm text-muted-foreground">
                {t("processVariants.revisions.form.changeReason.label")}
              </dt>

              <dd className="text-sm">{data.revision.changeReason ?? "-"}</dd>
            </div>

            <div>
              <dt className="text-sm text-muted-foreground">
                {t("processVariants.revisions.columns.releasedAt")}
              </dt>

              <dd className="text-sm">
                {data.revision.releasedAt
                  ? data.revision.releasedAt.toISOString().slice(0, 19).replace("T", " ")
                  : "-"}
              </dd>
            </div>

            <div className="sm:col-span-2">
              <dt className="text-sm text-muted-foreground">
                {t("processVariants.revisions.form.description.label")}
              </dt>

              <dd className="text-sm whitespace-pre-line">{data.revision.description ?? "-"}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
