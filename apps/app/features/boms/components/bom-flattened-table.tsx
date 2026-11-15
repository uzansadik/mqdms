import { getTranslations } from "@mqdms/i18n/server";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@mqdms/ui/components/table";

import type { BomFlattenedLine } from "../tree";

type BomFlattenedTableProps = {
  lines: BomFlattenedLine[];
};

/**
 * Düzleştirilmiş malzeme listesi.
 *
 * Üst grupların miktarları çarpılarak hesaplanır: bir bisiklet için iki
 * braket grubu varsa toplam braket sayısı iki, toplam cıvata sayısı sekizdir.
 */
export async function BomFlattenedTable({ lines }: BomFlattenedTableProps) {
  const t = await getTranslations();

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("boms.explosion.columns.code")}</TableHead>

          <TableHead>{t("boms.explosion.columns.name")}</TableHead>

          <TableHead>{t("boms.explosion.columns.unit")}</TableHead>

          <TableHead className="text-right">{t("boms.explosion.columns.quantity")}</TableHead>

          <TableHead className="text-right">{t("boms.explosion.columns.occurrences")}</TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        {lines.map((line) => (
          <TableRow key={`${line.childItemId}-${line.childItemRevision ?? ""}`}>
            <TableCell className="font-medium">{line.childItemCode ?? "-"}</TableCell>

            <TableCell>{line.childItemName ?? "-"}</TableCell>

            <TableCell>{line.unitOfMeasureCode ?? "-"}</TableCell>

            <TableCell className="text-right">{line.quantity}</TableCell>

            <TableCell className="text-right">{line.occurrenceCount}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
