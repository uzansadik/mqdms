import { getTranslations } from "@mqdms/i18n/server";
import { Badge } from "@mqdms/ui/components/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@mqdms/ui/components/table";

import type { BomFlattenedLine } from "../explosion";

/**
 * Hiyerarşik BOM ağacı.
 *
 * Ağaç istemci bileşenidir: dallar genişletilip daraltılabilir.
 */
export { BomTree } from "./bom-tree";

type BomFlattenedTableProps = {
  lines: BomFlattenedLine[];
};

/**
 * Düzleştirilmiş BOM.
 *
 * Aynı bileşen farklı revision veya farklı birimle kullanılıyorsa doğrulanmadan
 * tek satırda birleştirilmez; gruplama anahtarı ürün, revision ve birimdir.
 */
export async function BomFlattenedTable({ lines }: BomFlattenedTableProps) {
  const t = await getTranslations();

  if (lines.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("boms.explosion.empty")}</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("boms.explosion.columns.item")}</TableHead>

          <TableHead>{t("boms.explosion.columns.revision")}</TableHead>

          <TableHead>{t("boms.explosion.columns.quantity")}</TableHead>

          <TableHead>{t("boms.explosion.columns.occurrences")}</TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        {lines.map((line) => (
          <TableRow
            key={`${line.childItemId}|${line.childItemRevision ?? ""}|${line.unitOfMeasureId ?? ""}`}
          >
            <TableCell className="font-medium">
              {line.childItemCode ?? "-"}
              <span className="block text-xs text-muted-foreground">
                {line.childItemName ?? ""}
              </span>
            </TableCell>

            <TableCell>{line.childItemRevision ?? "-"}</TableCell>

            <TableCell>
              {line.quantity}
              {line.unitOfMeasureCode ? ` ${line.unitOfMeasureCode}` : ""}
            </TableCell>

            <TableCell>
              {line.occurrenceCount}
              {line.unresolved && (
                <Badge className="ml-2" variant="outline">
                  {t("boms.explosion.unresolved")}
                </Badge>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
