import { listAuditLogs } from "@mqdms/audit";
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

import { requireAuthContext } from "@/features/auth/session";
import { listProcessVariants } from "@/features/master-processes/repository";
import {
  getProcessDetailData,
  requireMasterProcessesAccess,
} from "@/features/master-processes/server";
import { StatusBadge } from "@/features/shared/status-badge";

type PageProps = {
  params: Promise<{ id: string }>;
};

/**
 * Master Process detayı.
 *
 * Sekmeler: genel bakış, varyantlar, geçmiş. Teknik içerik (Flow, Work
 * Element, ...) varyant revision'ı üzerinde tutulur ve sonraki dilimlerde
 * eklenir.
 */
export default async function MasterProcessDetailPage({ params }: PageProps) {
  const context = await requireAuthContext();

  await requireMasterProcessesAccess("read");

  const { id } = await params;

  const data = await getProcessDetailData(context.organizationId, id);

  if (!data) {
    notFound();
  }

  const [variants, history] = await Promise.all([
    listProcessVariants(context.organizationId, id),
    listAuditLogs({
      organizationId: context.organizationId,
      targetType: "process",
      targetId: id,
    }),
  ]);

  const t = await getTranslations();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{data.process.name}</h1>

            <StatusBadge
              label={t(`items.status.${data.process.status}`)}
              status={data.process.status}
            />

            {data.process.archivedAt && (
              <Badge variant="outline">{t("processes.archived.badge")}</Badge>
            )}
          </div>

          <p className="mt-1 text-sm text-muted-foreground">
            {data.process.code} · {t(`processes.categories.${data.process.category}`)}
          </p>
        </div>

        <Button asChild variant="outline">
          <Link href={`/master-processes/${data.process.id}/edit`}>
            {t("processes.actions.edit")}
          </Link>
        </Button>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">{t("processes.detail.tabs.overview")}</TabsTrigger>

          <TabsTrigger value="variants">{t("processes.detail.tabs.variants")}</TabsTrigger>

          <TabsTrigger value="history">{t("processes.detail.tabs.history")}</TabsTrigger>
        </TabsList>

        <TabsContent className="mt-4 space-y-4" value="overview">
          <Card>
            <CardHeader>
              <CardTitle>{t("processes.detail.overview.title")}</CardTitle>
            </CardHeader>

            <CardContent>
              <dl className="grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-sm text-muted-foreground">
                    {t("processes.form.code.label")}
                  </dt>

                  <dd className="text-sm">{data.process.code}</dd>
                </div>

                <div>
                  <dt className="text-sm text-muted-foreground">
                    {t("processes.form.category.label")}
                  </dt>

                  <dd className="text-sm">{t(`processes.categories.${data.process.category}`)}</dd>
                </div>

                <div className="sm:col-span-2">
                  <dt className="text-sm text-muted-foreground">
                    {t("processes.form.description.label")}
                  </dt>

                  <dd className="text-sm whitespace-pre-line">{data.process.description ?? "-"}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent className="mt-4 space-y-4" value="variants">
          <Card>
            <CardHeader>
              <CardTitle>{t("processes.detail.variants.title")}</CardTitle>
            </CardHeader>

            <CardContent>
              {variants.length === 0 ? (
                <Empty>
                  <EmptyHeader>
                    <EmptyTitle>{t("processes.detail.variants.empty.title")}</EmptyTitle>

                    <EmptyDescription>
                      {t("processes.detail.variants.empty.description")}
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("processes.detail.variants.columns.code")}</TableHead>

                      <TableHead>{t("processes.detail.variants.columns.name")}</TableHead>

                      <TableHead>{t("processes.detail.variants.columns.type")}</TableHead>

                      <TableHead>{t("processes.detail.variants.columns.status")}</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {variants.map((variant) => (
                      <TableRow key={variant.id}>
                        <TableCell className="font-medium">{variant.code}</TableCell>

                        <TableCell>{variant.name}</TableCell>

                        <TableCell>{t(`processVariants.types.${variant.variantType}`)}</TableCell>

                        <TableCell>
                          <StatusBadge
                            label={t(`items.status.${variant.status}`)}
                            status={variant.status}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent className="mt-4 space-y-4" value="history">
          <Card>
            <CardHeader>
              <CardTitle>{t("processes.detail.history.title")}</CardTitle>
            </CardHeader>

            <CardContent>
              {history.length === 0 ? (
                <Empty>
                  <EmptyHeader>
                    <EmptyTitle>{t("processes.detail.history.empty.title")}</EmptyTitle>

                    <EmptyDescription>
                      {t("processes.detail.history.empty.description")}
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("processes.detail.history.columns.action")}</TableHead>

                      <TableHead>{t("processes.detail.history.columns.date")}</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {history.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="font-medium">{entry.action}</TableCell>

                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {entry.createdAt.toISOString().slice(0, 19).replace("T", " ")}
                          </span>
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
