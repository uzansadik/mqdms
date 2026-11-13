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

import type { ItemListItem } from "../repository";
import { ItemRowActions } from "./item-row-actions";

type ItemTableProps = {
  items: ItemListItem[];
};

/** Ürün listesi tablosu. */
export async function ItemTable({ items }: ItemTableProps) {
  const t = await getTranslations();

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("items.list.columns.code")}</TableHead>

          <TableHead>{t("items.list.columns.name")}</TableHead>

          <TableHead>{t("items.list.columns.itemGroup")}</TableHead>

          <TableHead>{t("items.list.columns.itemType")}</TableHead>

          <TableHead>{t("items.list.columns.supplyType")}</TableHead>

          <TableHead>{t("items.list.columns.unit")}</TableHead>

          <TableHead>{t("items.list.columns.customerReferences")}</TableHead>

          <TableHead>{t("items.list.columns.currentRevision")}</TableHead>

          <TableHead>{t("items.list.columns.status")}</TableHead>

          <TableHead className="text-right">{t("items.list.columns.actions")}</TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        {items.map((item) => (
          <TableRow key={item.id}>
            <TableCell className="font-medium">
              <Link className="hover:underline" href={`/items/${item.id}/edit`}>
                {item.code}
              </Link>
            </TableCell>

            <TableCell>{item.name}</TableCell>

            <TableCell>{item.itemGroupName ?? "-"}</TableCell>

            <TableCell>{t(`items.itemType.${item.itemType}`)}</TableCell>

            <TableCell>
              {item.supplyType ? t(`items.supplyType.${item.supplyType}`) : "-"}
            </TableCell>

            <TableCell>{item.unitOfMeasureCode ?? "-"}</TableCell>

            <TableCell>{item.customerReferenceCount}</TableCell>

            <TableCell>{item.currentRevision ?? "-"}</TableCell>

            <TableCell>
              <StatusBadge label={t(`items.status.${item.status}`)} status={item.status} />
            </TableCell>

            <TableCell className="text-right">
              <ItemRowActions archived={Boolean(item.archivedAt)} itemId={item.id} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
