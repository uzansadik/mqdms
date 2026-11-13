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
import { BomFlattenedTable, BomTree } from "@/features/boms/components/bom-explosion";
import { BomLineForm } from "@/features/boms/components/bom-line-form";
import { BomRevisionForm } from "@/features/boms/components/bom-revision-form";
import { getBomDetailData, getBomEditorOptions, requireBomsAccess } from "@/features/boms/server";
import { StatusBadge } from "@/features/shared/status-badge";

type PageProps = {
  params: Promise<{ id: string }>;
};

/**
 * BOM detayı.
 *
 * Sekmeler: revision geçmişi, hiyerarşik ağaç ve düzleştirilmiş malzeme
 * listesi. Satır düzenleme ilgili revision modülüyle birlikte eklenir.
 */
export default async function BomDetailPage({ params }: PageProps) {
  const context = await requireAuthContext();

  await requireBomsAccess("read");

  const { id } = await params;

  const data = await getBomDetailData(context.organizationId, id);

  if (!data) {
    notFound();
  }

  const t = await getTranslations();

  const options = await getBomEditorOptions(context.organizationId);

  /*
   * Yayınlanmış bir revision'ın içeriği doğrudan değiştirilemez; satır
   * eylemleri yalnızca düzenlenebilir revision'larda görünür.
   */
  const isEditable = data.currentRevision?.status !== "RELEASED";

  const parentItemRevisions = options.itemRevisions.filter(
    (revision) => revision.itemId === data.bom.itemId,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{data.bom.name}</h1>

            <StatusBadge label={t(`items.status.${data.bom.status}`)} status={data.bom.status} />

            {data.bom.archivedAt && <Badge variant="outline">{t("boms.archived.badge")}</Badge>}
          </div>

          <p className="mt-1 text-sm text-muted-foreground">{data.bom.code}</p>
        </div>

        <Button asChild variant="outline">
          <Link href={`/boms/${data.bom.id}/edit`}>{t("boms.actions.edit")}</Link>
        </Button>
      </div>

      <Tabs defaultValue="tree">
        <TabsList>
          <TabsTrigger value="tree">{t("boms.detail.tabs.tree")}</TabsTrigger>

          <TabsTrigger value="flattened">{t("boms.detail.tabs.flattened")}</TabsTrigger>

          <TabsTrigger value="revisions">{t("boms.detail.tabs.revisions")}</TabsTrigger>
        </TabsList>

        <TabsContent className="mt-4 space-y-4" value="tree">
          <Card>
            <CardHeader>
              <CardTitle>
                {t("boms.explosion.tree")}
                {data.currentRevision ? ` · ${data.currentRevision.revision}` : ""}
              </CardTitle>
            </CardHeader>

            <CardContent>
              <BomTree editable={isEditable} nodes={data.tree} />
            </CardContent>
          </Card>

          {data.currentRevision && isEditable && (
            <BomLineForm
              bomRevisionId={data.currentRevision.id}
              bomRevisions={options.bomRevisions}
              itemRevisions={options.itemRevisions}
              items={options.items}
              units={options.units}
            />
          )}
        </TabsContent>

        <TabsContent className="mt-4 space-y-4" value="flattened">
          <Card>
            <CardHeader>
              <CardTitle>{t("boms.explosion.flattened")}</CardTitle>
            </CardHeader>

            <CardContent>
              <BomFlattenedTable lines={data.flattened} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent className="mt-4 space-y-4" value="revisions">
          <Card>
            <CardHeader>
              <CardTitle>{t("boms.revisions.title")}</CardTitle>
            </CardHeader>

            <CardContent>
              {data.revisions.length === 0 ? (
                <Empty>
                  <EmptyHeader>
                    <EmptyTitle>{t("boms.revisions.empty.title")}</EmptyTitle>

                    <EmptyDescription>{t("boms.revisions.empty.description")}</EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("boms.revisions.columns.revision")}</TableHead>

                      <TableHead>{t("boms.revisions.columns.status")}</TableHead>

                      <TableHead>{t("boms.revisions.columns.changeReason")}</TableHead>

                      <TableHead>{t("boms.revisions.columns.source")}</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {data.revisions.map((revision) => (
                      <TableRow key={revision.id}>
                        <TableCell className="font-medium">{revision.revision}</TableCell>

                        <TableCell>{t(`boms.revisions.status.${revision.status}`)}</TableCell>

                        <TableCell>{revision.changeReason ?? "-"}</TableCell>

                        <TableCell>
                          {revision.sourceSystem
                            ? `${revision.sourceSystem}${
                                revision.sourceRevision ? ` · ${revision.sourceRevision}` : ""
                              }`
                            : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <BomRevisionForm bomId={data.bom.id} parentItemRevisions={parentItemRevisions} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
