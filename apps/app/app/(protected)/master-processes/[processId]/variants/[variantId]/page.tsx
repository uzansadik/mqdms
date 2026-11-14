import { getTranslations } from "@mqdms/i18n/server";
import { Badge } from "@mqdms/ui/components/badge";
import { Button } from "@mqdms/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@mqdms/ui/components/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@mqdms/ui/components/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@mqdms/ui/components/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@mqdms/ui/components/tabs";
import Link from "next/link";
import { notFound } from "next/navigation";

import { canAccess, requireAuthContext } from "@/features/auth/session";
import {
  getProcessVariantDetailData,
  requireProcessVariantsAccess,
} from "@/features/process-variants/server";
import { StatusBadge } from "@/features/shared/status-badge";

type PageProps = {
  params: Promise<{ processId: string; variantId: string }>;
};

/**
 * Process Variant detayı.
 *
 * Sekmeler: genel bakış, revision'lar. Teknik içerik sekmeleri (Flow, Work
 * Element, ...) sonraki dilimlerde eklenir.
 */
export default async function ProcessVariantDetailPage({ params }: PageProps) {
  const context = await requireAuthContext();

  await requireProcessVariantsAccess("read");

  const { variantId } = await params;

  const data = await getProcessVariantDetailData(context.organizationId, variantId);

  if (!data) {
    notFound();
  }

  const t = await getTranslations();

  const canCompare = await canAccess(context, "processVariants", "compare");

  const basePath = `/master-processes/${data.variant.processId}/variants/${data.variant.id}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{data.variant.name}</h1>

            <Badge variant="outline">
              {t(`processVariants.types.${data.variant.variantType}`)}
            </Badge>

            <StatusBadge
              label={t(`items.status.${data.variant.status}`)}
              status={data.variant.status}
            />
          </div>

          <p className="mt-1 text-sm text-muted-foreground">
            {data.variant.code} ·{" "}
            <Link className="hover:underline" href={`/master-processes/${data.variant.processId}`}>
              {data.variant.processName}
            </Link>
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href={`${basePath}/edit`}>{t("processVariants.actions.edit")}</Link>
          </Button>

          {canCompare && (
            <Button asChild variant="outline">
              <Link href={`${basePath}/revisions/compare`}>
                {t("processVariants.actions.compare")}
              </Link>
            </Button>
          )}

          <Button asChild>
            <Link href={`${basePath}/revisions/new`}>
              {t("processVariants.revisions.actions.create")}
            </Link>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">{t("processVariants.detail.tabs.overview")}</TabsTrigger>

          <TabsTrigger value="revisions">{t("processVariants.detail.tabs.revisions")}</TabsTrigger>
        </TabsList>

        <TabsContent className="mt-4 space-y-4" value="overview">
          <Card>
            <CardHeader>
              <CardTitle>{t("processVariants.detail.overview.title")}</CardTitle>
            </CardHeader>

            <CardContent>
              <dl className="grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-sm text-muted-foreground">
                    {t("processVariants.form.code.label")}
                  </dt>

                  <dd className="text-sm">{data.variant.code}</dd>
                </div>

                <div>
                  <dt className="text-sm text-muted-foreground">
                    {t("processVariants.form.variantType.label")}
                  </dt>

                  <dd className="text-sm">
                    {t(`processVariants.types.${data.variant.variantType}`)}
                  </dd>
                </div>

                <div className="sm:col-span-2">
                  <dt className="text-sm text-muted-foreground">
                    {t("processVariants.form.description.label")}
                  </dt>

                  <dd className="text-sm whitespace-pre-line">{data.variant.description ?? "-"}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent className="mt-4 space-y-4" value="revisions">
          <Card>
            <CardHeader>
              <CardTitle>{t("processVariants.detail.revisions.title")}</CardTitle>
            </CardHeader>

            <CardContent>
              {data.revisions.length === 0 ? (
                <Empty>
                  <EmptyHeader>
                    <EmptyTitle>{t("processVariants.detail.revisions.empty.title")}</EmptyTitle>

                    <EmptyDescription>
                      {t("processVariants.detail.revisions.empty.description")}
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("processVariants.revisions.columns.revision")}</TableHead>

                      <TableHead>{t("processVariants.revisions.columns.status")}</TableHead>

                      <TableHead>{t("processVariants.revisions.columns.changeReason")}</TableHead>

                      <TableHead>{t("processVariants.revisions.columns.releasedAt")}</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {data.revisions.map((revision) => (
                      <TableRow key={revision.id}>
                        <TableCell className="font-medium">
                          <Link
                            className="hover:underline"
                            href={`${basePath}/revisions/${revision.id}`}
                          >
                            {revision.revision}
                          </Link>
                        </TableCell>

                        <TableCell>
                          <Badge
                            variant={
                              revision.status === "RELEASED"
                                ? "default"
                                : revision.status === "DRAFT"
                                  ? "secondary"
                                  : "outline"
                            }
                          >
                            {t(`processVariants.revisions.status.${revision.status}`)}
                          </Badge>
                        </TableCell>

                        <TableCell>{revision.changeReason ?? "-"}</TableCell>

                        <TableCell>
                          {revision.releasedAt
                            ? revision.releasedAt.toISOString().slice(0, 10)
                            : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
