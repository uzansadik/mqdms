import { getTranslations } from "@mqdms/i18n/server";
import { Button } from "@mqdms/ui/components/button";
import { Card, CardContent } from "@mqdms/ui/components/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@mqdms/ui/components/empty";
import Form from "next/form";
import Link from "next/link";

import { requireAuthContext } from "@/features/auth/session";
import { CustomerTable } from "@/features/customers/components/customer-table";
import { getCustomerListData, requireCustomersAccess } from "@/features/customers/server";

const PAGE_SIZE = 20;

type PageProps = {
  searchParams: Promise<{ q?: string; page?: string }>;
};

/**
 * Arşivlenen müşteriler.
 *
 * Arşivlenen kayıt fiziksel olarak silinmez; buradan arşivden çıkarılabilir.
 */
export default async function ArchivedCustomersPage({ searchParams }: PageProps) {
  const context = await requireAuthContext();

  await requireCustomersAccess("read");

  const params = await searchParams;

  const query = params.q?.trim() ?? "";
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);

  const t = await getTranslations();

  const data = await getCustomerListData({
    organizationId: context.organizationId,
    query: query || undefined,
    status: "ALL",
    archived: true,
    page,
    pageSize: PAGE_SIZE,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("customers.archived.title")}</h1>

          <p className="mt-1 text-sm text-muted-foreground">
            {t("customers.archived.description")}
          </p>
        </div>

        <Button asChild variant="outline">
          <Link href="/customers">{t("customers.archived.back")}</Link>
        </Button>
      </div>

      <Card>
        <CardContent>
          <Form action="/customers/archived" className="mb-6">
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label className="text-sm font-medium" htmlFor="q">
                  {t("customers.list.search.label")}
                </label>

                <input
                  className="mt-1 h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  defaultValue={query}
                  id="q"
                  name="q"
                  placeholder={t("customers.list.search.placeholder")}
                />
              </div>

              <Button type="submit">{t("customers.list.search.submit")}</Button>
            </div>
          </Form>

          {data.items.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>{t("customers.archived.empty.title")}</EmptyTitle>

                <EmptyDescription>{t("customers.archived.empty.description")}</EmptyDescription>
              </EmptyHeader>

              <EmptyContent>
                <Button asChild variant="outline">
                  <Link href="/customers">{t("customers.archived.back")}</Link>
                </Button>
              </EmptyContent>
            </Empty>
          ) : (
            <CustomerTable items={data.items} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
