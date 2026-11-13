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
import { Field, FieldGroup, FieldLabel } from "@mqdms/ui/components/field";
import { Input } from "@mqdms/ui/components/input";
import Form from "next/form";
import Link from "next/link";

import { requireAuthContext } from "@/features/auth/session";
import { ItemTable } from "@/features/items/components/item-table";
import { getItemListData, requireItemsAccess } from "@/features/items/server";

const PAGE_SIZE = 20;

type PageProps = {
  searchParams: Promise<{ q?: string; page?: string }>;
};

/** Arşivlenen ürünler. */
export default async function ArchivedItemsPage({ searchParams }: PageProps) {
  const context = await requireAuthContext();

  await requireItemsAccess("read");

  const params = await searchParams;

  const query = params.q?.trim() ?? "";
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);

  const t = await getTranslations();

  const data = await getItemListData({
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
          <h1 className="text-2xl font-semibold tracking-tight">{t("items.archived.title")}</h1>

          <p className="mt-1 text-sm text-muted-foreground">{t("items.archived.description")}</p>
        </div>

        <Button asChild variant="outline">
          <Link href="/items">{t("items.archived.back")}</Link>
        </Button>
      </div>

      <Card>
        <CardContent>
          <Form action="/items/archived" className="mb-6">
            <FieldGroup className="sm:flex-row sm:items-end">
              <Field className="flex-1">
                <FieldLabel htmlFor="q">{t("items.list.search.label")}</FieldLabel>

                <Input
                  defaultValue={query}
                  id="q"
                  name="q"
                  placeholder={t("items.list.search.placeholder")}
                />
              </Field>

              <Button type="submit">{t("items.list.search.submit")}</Button>
            </FieldGroup>
          </Form>

          {data.items.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>{t("items.archived.empty.title")}</EmptyTitle>

                <EmptyDescription>{t("items.archived.empty.description")}</EmptyDescription>
              </EmptyHeader>

              <EmptyContent>
                <Button asChild variant="outline">
                  <Link href="/items">{t("items.archived.back")}</Link>
                </Button>
              </EmptyContent>
            </Empty>
          ) : (
            <ItemTable items={data.items} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
