import { getTranslations } from "@mqdms/i18n/server";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@mqdms/ui/components/table";
import Link from "next/link";

import { StatusBadge } from "@/features/shared/status-badge";

import type { BomListItem } from "../repository";

type BomTableProps = {
  items: BomListItem[];
};

/** BOM listesi tablosu. */
export async function BomTable({ items }: BomTableProps) {
  const t = await getTranslations();

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("boms.list.columns.code")}</TableHead>

          <TableHead>{t("boms.list.columns.name")}</TableHead>

          <TableHead>{t("boms.list.columns.item")}</TableHead>

          <TableHead>{t("boms.list.columns.bomType")}</TableHead>

          <TableHead>{t("boms.list.columns.revisions")}</TableHead>

          <TableHead>{t("boms.list.columns.currentRevision")}</TableHead>

          <TableHead>{t("boms.list.columns.status")}</TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        {items.map((item) => (
          <TableRow key={item.id}>
            <TableCell className="font-medium">
              <Link className="hover:underline" href={`/boms/${item.id}`}>
                {item.code}
              </Link>
            </TableCell>

            <TableCell>{item.name}</TableCell>

            <TableCell>
              {item.itemCode ?? "-"}
              {item.itemName ? (
                <span className="block text-xs text-muted-foreground">{item.itemName}</span>
              ) : null}
            </TableCell>

            <TableCell>{t(`boms.bomType.${item.bomType}`)}</TableCell>

            <TableCell>{item.revisionCount}</TableCell>

            <TableCell>{item.currentRevision ?? "-"}</TableCell>

            <TableCell>
              <StatusBadge label={t(`items.status.${item.status}`)} status={item.status} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
