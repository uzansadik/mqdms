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

import type { ItemGroupListItem } from "../repository";
import { ItemGroupRowActions } from "./item-group-row-actions";

type ItemGroupTableProps = {
  items: ItemGroupListItem[];
};

/** Ürün grubu listesi tablosu. */
export async function ItemGroupTable({ items }: ItemGroupTableProps) {
  const t = await getTranslations();

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("itemGroups.list.columns.code")}</TableHead>

          <TableHead>{t("itemGroups.list.columns.name")}</TableHead>

          <TableHead>{t("itemGroups.list.columns.itemCount")}</TableHead>

          <TableHead>{t("itemGroups.list.columns.childGroupCount")}</TableHead>

          <TableHead>{t("itemGroups.list.columns.sortOrder")}</TableHead>

          <TableHead>{t("itemGroups.list.columns.status")}</TableHead>

          <TableHead className="text-right">{t("itemGroups.list.columns.actions")}</TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        {items.map((group) => (
          <TableRow key={group.id}>
            <TableCell className="font-medium">
              <Link className="hover:underline" href={`/item-groups/${group.id}/edit`}>
                {group.code}
              </Link>
            </TableCell>

            <TableCell>{group.name}</TableCell>

            <TableCell>{group.itemCount}</TableCell>

            <TableCell>{group.childGroupCount}</TableCell>

            <TableCell>{group.sortOrder}</TableCell>

            <TableCell>
              <StatusBadge label={t(`items.status.${group.status}`)} status={group.status} />
            </TableCell>

            <TableCell className="text-right">
              <ItemGroupRowActions archived={Boolean(group.archivedAt)} groupId={group.id} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
