import { getTranslations } from "@mqdms/i18n/server";
import { Badge } from "@mqdms/ui/components/badge";
import { Button } from "@mqdms/ui/components/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@mqdms/ui/components/table";
import Form from "next/form";

import type { BomRevisionChange } from "../comparison";

type BomComparisonProps = {
  /** Karşılaştırılacak BOM. */
  bomId: string;

  /** Revision'lar (eski → yeni sırada). */
  revisions: {
    id: string;
    revision: string;
    status: "DRAFT" | "IN_REVIEW" | "RELEASED" | "SUPERSEDED";
  }[];

  /** Seçilen önceki revision. */
  fromId: string | null;

  /** Seçilen yeni revision. */
  toId: string | null;

  /** Karşılaştırma sonucu; seçim yapılmadıysa null. */
  changes: BomRevisionChange[] | null;
};

/**
 * İki BOM revision'ı arasındaki fark.
 *
 * Bu fazda değişiklikler **görüntülenir ve kaydedilir**: Process Flow,
 * PFMEA veya Kontrol Plan üzerinde otomatik aksiyon üretilmez.
 */
export async function BomComparison({
  bomId,
  revisions,
  fromId,
  toId,
  changes,
}: BomComparisonProps) {
  const t = await getTranslations();

  return (
    <div className="space-y-4">
      <Form action={`/boms/${bomId}`} className="flex flex-wrap items-end gap-3">
        <div className="min-w-52">
          <label className="text-sm font-medium" htmlFor="compareFrom">
            {t("boms.comparison.from")}
          </label>

          <select
            className="mt-1 h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            defaultValue={fromId ?? ""}
            id="compareFrom"
            name="compareFrom"
          >
            <option value="">{t("boms.comparison.select")}</option>

            {revisions.map((revision) => (
              <option key={revision.id} value={revision.id}>
                {revision.revision}
              </option>
            ))}
          </select>
        </div>

        <div className="min-w-52">
          <label className="text-sm font-medium" htmlFor="compareTo">
            {t("boms.comparison.to")}
          </label>

          <select
            className="mt-1 h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            defaultValue={toId ?? ""}
            id="compareTo"
            name="compareTo"
          >
            <option value="">{t("boms.comparison.select")}</option>

            {revisions.map((revision) => (
              <option key={revision.id} value={revision.id}>
                {revision.revision}
              </option>
            ))}
          </select>
        </div>

        <Button type="submit">{t("boms.comparison.submit")}</Button>
      </Form>

      {changes === null ? (
        <p className="text-sm text-muted-foreground">{t("boms.comparison.hint")}</p>
      ) : changes.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("boms.comparison.empty")}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("boms.comparison.columns.change")}</TableHead>

              <TableHead>{t("boms.comparison.columns.item")}</TableHead>

              <TableHead>{t("boms.comparison.columns.before")}</TableHead>

              <TableHead>{t("boms.comparison.columns.after")}</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {changes.map((change) => (
              <TableRow
                key={`${change.type}-${change.referenceDesignation ?? change.childItemId}-${change.lineNumber ?? change.previousLineNumber}`}
              >
                <TableCell>
                  <Badge variant="outline">{t(`boms.changeType.${change.type}`)}</Badge>
                </TableCell>

                <TableCell>
                  {change.childItemCode ?? "-"}
                  <span className="block text-xs text-muted-foreground">
                    {change.referenceDesignation ? `${change.referenceDesignation} · ` : ""}
                    {t("boms.comparison.columns.line")}{" "}
                    {change.lineNumber ?? change.previousLineNumber ?? "-"}
                  </span>
                </TableCell>

                <TableCell className="text-sm">
                  {change.before
                    ? `${change.before.quantity}${
                        change.before.unitOfMeasureCode ? ` ${change.before.unitOfMeasureCode}` : ""
                      }${
                        change.before.childItemRevision
                          ? ` · ${change.before.childItemRevision}`
                          : ""
                      }`
                    : "-"}
                </TableCell>

                <TableCell className="text-sm">
                  {change.after
                    ? `${change.after.quantity}${
                        change.after.unitOfMeasureCode ? ` ${change.after.unitOfMeasureCode}` : ""
                      }${
                        change.after.childItemRevision ? ` · ${change.after.childItemRevision}` : ""
                      }`
                    : "-"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
