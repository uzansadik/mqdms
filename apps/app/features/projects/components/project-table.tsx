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

import type { ProjectListItem } from "../repository";
import { ProjectRowActions } from "./project-row-actions";

type ProjectTableProps = {
  items: ProjectListItem[];
};

/** Proje listesi tablosu. */
export async function ProjectTable({ items }: ProjectTableProps) {
  const t = await getTranslations();

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("projects.list.columns.code")}</TableHead>

          <TableHead>{t("projects.list.columns.name")}</TableHead>

          <TableHead>{t("projects.list.columns.customer")}</TableHead>

          <TableHead>{t("projects.list.columns.status")}</TableHead>

          <TableHead className="text-right">{t("projects.list.columns.actions")}</TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        {items.map((item) => (
          <TableRow key={item.id}>
            <TableCell className="font-medium">
              <Link className="hover:underline" href={`/projects/${item.id}`}>
                {item.code}
              </Link>
            </TableCell>

            <TableCell>
              <Link className="hover:underline" href={`/projects/${item.id}`}>
                {item.name}
              </Link>
            </TableCell>

            <TableCell>{item.customerName ?? "-"}</TableCell>

            <TableCell>
              <StatusBadge label={t(`projects.status.${item.status}`)} status={item.status} />
            </TableCell>

            <TableCell className="text-right">
              <ProjectRowActions archived={Boolean(item.archivedAt)} projectId={item.id} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
