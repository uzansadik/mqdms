import { getTranslations } from "@mqdms/i18n/server";
import { Badge } from "@mqdms/ui/components/badge";
import { Button } from "@mqdms/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@mqdms/ui/components/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@mqdms/ui/components/tabs";
import Link from "next/link";
import { notFound } from "next/navigation";

import { canAccess, requireAuthContext } from "@/features/auth/session";
import { ApplicabilityPanel } from "@/features/process-io/components/applicability-panel";
import { IoPanel } from "@/features/process-io/components/io-panel";
import { FunctionPanel } from "@/features/process-requirements/components/function-panel";
import { RequirementPanel } from "@/features/process-requirements/components/requirement-panel";
import { ProcessVariantRevisionActions } from "@/features/process-variants/components/process-variant-revision-actions";
import {
  getProcessVariantRevisionContentData,
  getProcessVariantRevisionDetailData,
  requireProcessVariantsAccess,
} from "@/features/process-variants/server";
import { WorkElementPanel } from "@/features/process-work-elements/components/work-element-panel";

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

  const [canSubmit, canApprove, canRelease, canReject, content] = await Promise.all([
    canAccess(context, "processVariants", "submit"),
    canAccess(context, "processVariants", "approve"),
    canAccess(context, "processVariants", "release"),
    canAccess(context, "processVariants", "reject"),
    getProcessVariantRevisionContentData(context.organizationId, revisionId),
  ]);

  const isEditable = data.revision.status === "DRAFT";

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

        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline">
            <Link
              href={`/master-processes/${data.variant.processId}/variants/${data.variant.id}/revisions/${data.revision.id}/flow`}
            >
              {t("flow.title")}
            </Link>
          </Button>

          <Button asChild variant="outline">
            <Link
              href={`/master-processes/${data.variant.processId}/variants/${data.variant.id}/revisions/${data.revision.id}/source-update`}
            >
              {t("processVariants.actions.sourceUpdate")}
            </Link>
          </Button>

          <ProcessVariantRevisionActions
            canApprove={canApprove}
            canRelease={canRelease}
            canReject={canReject}
            canSubmit={canSubmit}
            revisionId={data.revision.id}
            status={data.revision.status}
          />
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">
            {t("processVariants.detail.revision.tabs.overview")}
          </TabsTrigger>

          <TabsTrigger value="workElements">
            {t("processVariants.detail.revision.tabs.workElements")}
          </TabsTrigger>

          <TabsTrigger value="functions">
            {t("processVariants.detail.revision.tabs.functions")}
          </TabsTrigger>

          <TabsTrigger value="requirements">
            {t("processVariants.detail.revision.tabs.requirements")}
          </TabsTrigger>

          <TabsTrigger value="io">{t("processVariants.detail.revision.tabs.io")}</TabsTrigger>

          <TabsTrigger value="applicability">
            {t("processVariants.detail.revision.tabs.applicability")}
          </TabsTrigger>
        </TabsList>

        <TabsContent className="mt-4 space-y-4" value="overview">
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

                  <dd className="text-sm whitespace-pre-line">
                    {data.revision.description ?? "-"}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent className="mt-4 space-y-4" value="workElements">
          <WorkElementPanel
            editable={isEditable}
            itemGroups={content.itemGroups}
            items={content.items}
            revisionId={data.revision.id}
            workElements={content.workElements}
          />
        </TabsContent>

        <TabsContent className="mt-4 space-y-4" value="functions">
          <FunctionPanel
            editable={isEditable}
            functions={content.functions}
            links={content.links}
            requirements={content.requirements.map((entry) => ({
              id: entry.id,
              code: entry.code,
              name: entry.name,
            }))}
            revisionId={data.revision.id}
            workElements={content.workElements.map((entry) => ({
              id: entry.id,
              code: entry.code,
              name: entry.name,
            }))}
          />
        </TabsContent>

        <TabsContent className="mt-4 space-y-4" value="requirements">
          <RequirementPanel
            editable={isEditable}
            requirements={content.requirements}
            revisionId={data.revision.id}
          />
        </TabsContent>

        <TabsContent className="mt-4 space-y-4" value="io">
          <IoPanel
            definitions={content.ioDefinitions}
            editable={isEditable}
            itemGroups={content.itemGroups}
            items={content.items}
            revisionId={data.revision.id}
          />
        </TabsContent>

        <TabsContent className="mt-4 space-y-4" value="applicability">
          <ApplicabilityPanel
            applicabilities={content.applicabilities}
            editable={isEditable}
            itemGroups={content.itemGroups}
            revisionId={data.revision.id}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
