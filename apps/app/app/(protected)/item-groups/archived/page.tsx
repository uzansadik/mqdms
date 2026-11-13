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
import { ItemGroupTable } from "@/features/item-groups/components/item-group-table";
import { getItemGroupListData, requireItemGroupsAccess } from "@/features/item-groups/server";

const PAGE_SIZE = 20;

type PageProps = {
  searchParams: Promise<{ q?: string; page?: string }>;
};

/** Arşivlenen ürün grupları. */
export default async function ArchivedItemGroupsPage({ searchParams }: PageProps) {
  const context = await requireAuthContext();

  await requireItemGroupsAccess("read");

  const params = await searchParams;

  const query = params.q?.trim() ?? "";
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);

  const t = await getTranslations();

  const data = await getItemGroupListData({
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
          <h1 className="text-2xl font-semibold tracking-tight">
            {t("itemGroups.archived.title")}
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            {t("itemGroups.archived.description")}
          </p>
        </div>

        <Button asChild variant="outline">
          <Link href="/item-groups">{t("itemGroups.archived.back")}</Link>
        </Button>
      </div>

      <Card>
        <CardContent>
          <Form action="/item-groups/archived" className="mb-6">
            <FieldGroup className="sm:flex-row sm:items-end">
              <Field className="flex-1">
                <FieldLabel htmlFor="q">{t("itemGroups.list.search.label")}</FieldLabel>

                <Input
                  defaultValue={query}
                  id="q"
                  name="q"
                  placeholder={t("itemGroups.list.search.placeholder")}
                />
              </Field>

              <Button type="submit">{t("itemGroups.list.search.submit")}</Button>
            </FieldGroup>
          </Form>

          {data.items.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>{t("itemGroups.archived.empty.title")}</EmptyTitle>

                <EmptyDescription>{t("itemGroups.archived.empty.description")}</EmptyDescription>
              </EmptyHeader>

              <EmptyContent>
                <Button asChild variant="outline">
                  <Link href="/item-groups">{t("itemGroups.archived.back")}</Link>
                </Button>
              </EmptyContent>
            </Empty>
          ) : (
            <ItemGroupTable items={data.items} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
