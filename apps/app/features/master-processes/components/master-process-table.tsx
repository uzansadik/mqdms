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

import type { ProcessListItem } from "../repository";
import { MasterProcessRowActions } from "./master-process-row-actions";

type MasterProcessTableProps = {
  processes: ProcessListItem[];
};

/** Master Process listesi tablosu. */
export async function MasterProcessTable({ processes }: MasterProcessTableProps) {
  const t = await getTranslations();

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("processes.list.columns.code")}</TableHead>

          <TableHead>{t("processes.list.columns.name")}</TableHead>

          <TableHead>{t("processes.list.columns.category")}</TableHead>

          <TableHead>{t("processes.list.columns.variantCount")}</TableHead>

          <TableHead>{t("processes.list.columns.status")}</TableHead>

          <TableHead>{t("processes.list.columns.updatedAt")}</TableHead>

          <TableHead className="text-right">{t("processes.list.columns.actions")}</TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        {processes.map((item) => (
          <TableRow key={item.id}>
            <TableCell className="font-medium">
              <Link className="hover:underline" href={`/master-processes/${item.id}`}>
                {item.code}
              </Link>
            </TableCell>

            <TableCell>{item.name}</TableCell>

            <TableCell>{t(`processes.categories.${item.category}`)}</TableCell>

            <TableCell>{item.variantCount}</TableCell>

            <TableCell>
              <StatusBadge label={t(`items.status.${item.status}`)} status={item.status} />
            </TableCell>

            <TableCell>
              <span className="text-sm text-muted-foreground">
                {item.updatedAt.toISOString().slice(0, 10)}
              </span>
            </TableCell>

            <TableCell className="text-right">
              <MasterProcessRowActions archived={item.archivedAt !== null} processId={item.id} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
