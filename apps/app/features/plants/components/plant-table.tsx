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

import type { PlantListItem } from "../repository";
import { PlantRowActions } from "./plant-row-actions";

type PlantTableProps = {
  items: PlantListItem[];
};

/** Tesis listesi tablosu. */
export async function PlantTable({ items }: PlantTableProps) {
  const t = await getTranslations();

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("plants.list.columns.code")}</TableHead>

          <TableHead>{t("plants.list.columns.name")}</TableHead>

          <TableHead>{t("plants.list.columns.city")}</TableHead>

          <TableHead>{t("plants.list.columns.projectCount")}</TableHead>

          <TableHead>{t("plants.list.columns.status")}</TableHead>

          <TableHead className="text-right">{t("plants.list.columns.actions")}</TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        {items.map((item) => (
          <TableRow key={item.id}>
            <TableCell className="font-medium">
              <Link className="hover:underline" href={`/plants/${item.id}`}>
                {item.code}
              </Link>
            </TableCell>

            <TableCell>
              <Link className="hover:underline" href={`/plants/${item.id}`}>
                {item.name}
              </Link>
            </TableCell>

            <TableCell>{item.city ?? "-"}</TableCell>

            <TableCell>{item.projectCount}</TableCell>

            <TableCell>
              <StatusBadge label={t(`plants.status.${item.status}`)} status={item.status} />
            </TableCell>

            <TableCell className="text-right">
              <PlantRowActions archived={Boolean(item.archivedAt)} plantId={item.id} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
