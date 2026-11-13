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

import type { CustomerListItem } from "../repository";
import { CustomerRowActions } from "./customer-row-actions";

type CustomerTableProps = {
  items: CustomerListItem[];
};

/**
 * Müşteri listesi tablosu.
 *
 * Sunucu bileşenidir: satırlar veritabanından gelir, istemciye yalnızca
 * eylem satırı gönderilir.
 */
export async function CustomerTable({ items }: CustomerTableProps) {
  const t = await getTranslations();

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("customers.list.columns.code")}</TableHead>

          <TableHead>{t("customers.list.columns.name")}</TableHead>

          <TableHead>{t("customers.list.columns.country")}</TableHead>

          <TableHead>{t("customers.list.columns.siteCount")}</TableHead>

          <TableHead>{t("customers.list.columns.projectCount")}</TableHead>

          <TableHead>{t("customers.list.columns.status")}</TableHead>

          <TableHead className="text-right">{t("customers.list.columns.actions")}</TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        {items.map((item) => (
          <TableRow key={item.id}>
            <TableCell className="font-medium">
              <Link className="hover:underline" href={`/customers/${item.id}`}>
                {item.code}
              </Link>
            </TableCell>

            <TableCell>
              <Link className="hover:underline" href={`/customers/${item.id}`}>
                {item.name}
              </Link>
            </TableCell>

            <TableCell>{item.countryCode ?? "-"}</TableCell>

            <TableCell>{item.siteCount}</TableCell>

            <TableCell>{item.activeProjectCount}</TableCell>

            <TableCell>
              <StatusBadge label={t(`customers.status.${item.status}`)} status={item.status} />
            </TableCell>

            <TableCell className="text-right">
              <CustomerRowActions archived={Boolean(item.archivedAt)} customerId={item.id} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
