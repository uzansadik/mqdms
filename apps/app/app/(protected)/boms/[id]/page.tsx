import { hasPermission } from "@mqdms/auth/permissions/server";
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
import { compareBomRevisions } from "@/features/boms/compare";
import { BomComparison } from "@/features/boms/components/bom-comparison";
import { BomFlattenedTable } from "@/features/boms/components/bom-flattened-table";
import { BomRevisionActions } from "@/features/boms/components/bom-revision-actions";
import { BomTreeGrid } from "@/features/boms/components/bom-tree-grid";
import { getBomDetailData, requireBomsAccess } from "@/features/boms/server";
import { StatusBadge } from "@/features/shared/status-badge";
import { listUnitOptions } from "@/features/units/repository";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ compareFrom?: string; compareTo?: string; revision?: string }>;
};

/**
 * BOM detayı.
 *
 * Ürün ağacı tek bir TreeGrid içinde gösterilir: alt gruplar ayrı BOM
 * değildir, aynı revision'ın satırlarıdır. Revision geçmişi ve karşılaştırma
 * ayrı sekmelerde durur.
 */
export default async function BomDetailPage({ params, searchParams }: PageProps) {
  const context = await requireAuthContext();

  await requireBomsAccess("read");

  const { id } = await params;

  const query = await searchParams;

  const data = await getBomDetailData(context.organizationId, id, query.revision ?? null);

  if (!data) {
    notFound();
  }

  const t = await getTranslations();

  const revision = data.currentRevision;

  /*
   * Yayınlanmış ya da incelemede olan revision'lar salt okunurdur; yalnızca
   * taslak üzerinde düzenleme yapılabilir.
   */
  const isEditable = revision?.status === "DRAFT";

  const hasOpenDraft = data.revisions.some(
    (candidate) => candidate.status === "DRAFT" || candidate.status === "IN_REVIEW",
  );

  const compareFrom = query.compareFrom ?? null;
  const compareTo = query.compareTo ?? null;

  const changes =
    compareFrom && compareTo
      ? await compareBomRevisions(context.organizationId, compareFrom, compareTo)
      : null;

  const [units, canSubmit, canRelease] = await Promise.all([
    listUnitOptions(context.organizationId),
    hasPermission(context, "boms", "submit"),
    hasPermission(context, "boms", "release"),
  ]);

  const rootUnitCode =
    units.find((unit) => unit.id === data.rootItem?.unitOfMeasureId)?.code ?? null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{data.bom.name}</h1>

            <StatusBadge label={t(`items.status.${data.bom.status}`)} status={data.bom.status} />

            {revision ? (
              <Badge variant="outline">
                {revision.revision} · {t(`boms.revisions.status.${revision.status}`)}
              </Badge>
            ) : null}

            {data.bom.archivedAt && <Badge variant="outline">{t("boms.archived.badge")}</Badge>}
          </div>

          <p className="mt-1 text-sm text-muted-foreground">
            {data.bom.code}
            {data.rootItem ? ` · ${data.rootItem.code} ${data.rootItem.name}` : ""}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {revision ? (
            <BomRevisionActions
              bomId={data.bom.id}
              canRelease={canRelease}
              canSubmit={canSubmit}
              hasOpenDraft={hasOpenDraft}
              revisionId={revision.id}
              status={revision.status}
            />
          ) : null}

          <Button asChild variant="outline">
            <Link href={`/boms/${data.bom.id}/edit`}>{t("boms.actions.edit")}</Link>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="tree">
        <TabsList>
          <TabsTrigger value="tree">{t("boms.detail.tabs.tree")}</TabsTrigger>

          <TabsTrigger value="flattened">{t("boms.detail.tabs.flattened")}</TabsTrigger>

          <TabsTrigger value="revisions">{t("boms.detail.tabs.revisions")}</TabsTrigger>

          <TabsTrigger value="comparison">{t("boms.detail.tabs.comparison")}</TabsTrigger>
        </TabsList>

        <TabsContent className="mt-4 space-y-4" value="tree">
          <Card>
            <CardHeader>
              <CardTitle>
                {t("boms.explosion.tree")}
                {revision ? ` · ${revision.revision}` : ""}
              </CardTitle>
            </CardHeader>

            <CardContent>
              {revision && data.rootItem ? (
                <BomTreeGrid
                  editable={isEditable}
                  initialLines={data.lines.map((line) => ({
                    id: line.id,
                    parentLineId: line.parentLineId,
                    childItemId: line.childItemId,
                    childItemCode: line.childItemCode ?? "",
                    childItemName: line.childItemName ?? "",
                    childItemType: line.childItemType,
                    childItemStructureType: line.childItemStructureType,
                    childItemSupplyType: line.childItemSupplyType,
                    childItemIsSellable: line.childItemIsSellable,
                    quantity: line.quantity,
                    unitOfMeasureId: line.unitOfMeasureId,
                    sortOrder: line.sortOrder,
                    childItemRevisionId: line.childItemRevisionId,
                  }))}
                  lockVersion={revision.lockVersion}
                  revisionId={revision.id}
                  rootItem={{
                    id: data.rootItem.id,
                    code: data.rootItem.code,
                    name: data.rootItem.name,
                    itemType: data.rootItem.itemType,
                    structureType: data.rootItem.structureType,
                    supplyType: data.rootItem.supplyType,
                    isSellable: data.rootItem.isSellable,
                    unitOfMeasureId: data.rootItem.unitOfMeasureId,
                    unitOfMeasureCode: rootUnitCode,
                  }}
                  units={units}
                />
              ) : (
                <Empty>
                  <EmptyHeader>
                    <EmptyTitle>{t("boms.detail.tree.empty.title")}</EmptyTitle>

                    <EmptyDescription>{t("boms.detail.tree.empty.description")}</EmptyDescription>
                  </EmptyHeader>
                </Empty>
              )}
            </CardContent>
          </Card>
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
                    {data.revisions.map((candidate) => (
                      <TableRow key={candidate.id}>
                        <TableCell className="font-medium">
                          <Link
                            className="hover:underline"
                            href={`/boms/${data.bom.id}?revision=${candidate.id}`}
                          >
                            {candidate.revision}
                          </Link>
                        </TableCell>

                        <TableCell>{t(`boms.revisions.status.${candidate.status}`)}</TableCell>

                        <TableCell>{candidate.changeReason ?? "-"}</TableCell>

                        <TableCell>
                          {candidate.sourceSystem
                            ? `${candidate.sourceSystem}${
                                candidate.sourceRevision ? ` · ${candidate.sourceRevision}` : ""
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
        </TabsContent>

        <TabsContent className="mt-4 space-y-4" value="comparison">
          <Card>
            <CardHeader>
              <CardTitle>{t("boms.comparison.title")}</CardTitle>
            </CardHeader>

            <CardContent>
              <BomComparison
                bomId={data.bom.id}
                changes={changes}
                fromId={compareFrom}
                revisions={data.revisions}
                toId={compareTo}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
