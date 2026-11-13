import { getTranslations } from "@mqdms/i18n/server";
import { Badge } from "@mqdms/ui/components/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@mqdms/ui/components/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@mqdms/ui/components/table";
import Form from "next/form";

import type { ProductStructureAnalysis, ProductStructureCategory } from "../analysis";

type ProductStructurePanelProps = {
  /** Formun gönderileceği yol (proje detay sayfası). */
  path: string;

  /** Projenin deliverable BOM revision'ları. */
  bomRevisions: { id: string; label: string }[];

  /** Seçili revision; yoksa null. */
  selectedId: string | null;

  /** Analiz sonucu; seçim yapılmadıysa null. */
  analysis: ProductStructureAnalysis | null;
};

/**
 * Ürün ağacı analizi.
 *
 * Bu fazda yalnızca **görüntülenir**: GKK kimyasal/metal önerisi, eksik
 * process step tespiti veya ürün ailesi process flow önerisi üretilmez. Bu
 * öneriler ileride kalite etki değerlendirme sisteminin girdisi olacak.
 */
export async function ProductStructurePanel({
  path,
  bomRevisions,
  selectedId,
  analysis,
}: ProductStructurePanelProps) {
  const t = await getTranslations();

  return (
    <div className="space-y-4">
      {bomRevisions.length > 0 && (
        <Form action={path} className="flex flex-wrap items-end gap-3">
          <div className="min-w-64">
            <label className="text-sm font-medium" htmlFor="structure">
              {t("productStructure.deliverable")}
            </label>

            <select
              className="mt-1 h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              defaultValue={selectedId ?? ""}
              id="structure"
              name="structure"
            >
              <option value="">{t("productStructure.select")}</option>

              {bomRevisions.map((revision) => (
                <option key={revision.id} value={revision.id}>
                  {revision.label}
                </option>
              ))}
            </select>
          </div>

          <button
            className="h-8 rounded-lg border border-input px-3 text-sm font-medium outline-none hover:bg-accent focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            type="submit"
          >
            {t("productStructure.analyze")}
          </button>
        </Form>
      )}

      {analysis === null ? (
        <p className="text-sm text-muted-foreground">{t("productStructure.hint")}</p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">
                  {t("productStructure.metrics.uniqueItems")}
                </CardTitle>
              </CardHeader>

              <CardContent>
                <p className="text-2xl font-semibold">{analysis.uniqueItemCount}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">
                  {t("productStructure.metrics.withOwnBom")}
                </CardTitle>
              </CardHeader>

              <CardContent>
                <p className="text-2xl font-semibold">{analysis.itemsWithOwnBomCount}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">
                  {t("productStructure.metrics.unclassified")}
                </CardTitle>
              </CardHeader>

              <CardContent>
                <p className="text-2xl font-semibold">{analysis.unclassifiedItemCount}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">
                  {t("productStructure.metrics.unresolved")}
                </CardTitle>
              </CardHeader>

              <CardContent>
                <p className="text-2xl font-semibold">{analysis.unresolvedReferenceCount}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">{t("productStructure.byCategory")}</CardTitle>
            </CardHeader>

            <CardContent>
              <div className="flex flex-wrap gap-2">
                {Object.entries(analysis.byCategory)
                  .filter(([, count]) => count > 0)
                  .map(([category, count]) => (
                    <Badge key={category} variant="secondary">
                      {t(`productStructure.category.${category as ProductStructureCategory}`)}:{" "}
                      {count}
                    </Badge>
                  ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">{t("productStructure.bySupplyType")}</CardTitle>
            </CardHeader>

            <CardContent>
              <div className="flex flex-wrap gap-2">
                {Object.entries(analysis.bySupplyType).map(([supplyType, count]) => (
                  <Badge key={supplyType} variant="outline">
                    {t(
                      `items.supplyType.${supplyType as "MANUFACTURED" | "PURCHASED" | "OUTSOURCED" | "MIXED" | "UNKNOWN"}`,
                    )}
                    : {count}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {analysis.repeatedUsage.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">{t("productStructure.repeatedUsage")}</CardTitle>
              </CardHeader>

              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("projectItems.list.columns.item")}</TableHead>

                      <TableHead>{t("productStructure.occurrenceCount")}</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {analysis.repeatedUsage.map((usage) => (
                      <TableRow key={usage.itemId}>
                        <TableCell className="font-medium">
                          {usage.itemCode ?? "-"}
                          <span className="block text-xs text-muted-foreground">
                            {usage.itemName ?? ""}
                          </span>
                        </TableCell>

                        <TableCell>{usage.occurrenceCount}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
