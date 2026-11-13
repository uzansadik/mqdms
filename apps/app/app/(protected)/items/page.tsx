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
import { NativeSelect, NativeSelectOption } from "@mqdms/ui/components/native-select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@mqdms/ui/components/pagination";
import Form from "next/form";
import Link from "next/link";

import { requireAuthContext } from "@/features/auth/session";
import { listItemGroupOptions } from "@/features/item-groups/repository";
import { ItemTable } from "@/features/items/components/item-table";
import { getItemListData, requireItemsAccess } from "@/features/items/server";

const PAGE_SIZE = 20;

type PageProps = {
  searchParams: Promise<{ q?: string; status?: string; group?: string; page?: string }>;
};

/**
 * Ürün listesi.
 *
 * Arama, durum filtresi, grup filtresi ve sayfalama URL state'i üzerinden
 * yürür.
 */
export default async function ItemsPage({ searchParams }: PageProps) {
  const context = await requireAuthContext();

  await requireItemsAccess("read");

  const params = await searchParams;

  const query = params.q?.trim() ?? "";
  const status = params.status ?? "ALL";
  const group = params.group ?? "";
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);

  const t = await getTranslations();

  const [data, groups] = await Promise.all([
    getItemListData({
      organizationId: context.organizationId,
      query: query || undefined,
      status: status === "ACTIVE" || status === "INACTIVE" ? status : "ALL",
      itemGroupId: group || undefined,
      archived: false,
      page,
      pageSize: PAGE_SIZE,
    }),
    listItemGroupOptions(context.organizationId),
  ]);

  const buildHref = (targetPage: number) => {
    const search = new URLSearchParams();

    if (query) {
      search.set("q", query);
    }

    if (status !== "ALL") {
      search.set("status", status);
    }

    if (group) {
      search.set("group", group);
    }

    if (targetPage > 1) {
      search.set("page", String(targetPage));
    }

    const queryString = search.toString();

    return queryString ? `/items?${queryString}` : "/items";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("items.title")}</h1>

          <p className="mt-1 text-sm text-muted-foreground">{t("items.description")}</p>
        </div>

        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/items/archived">{t("items.archived.title")}</Link>
          </Button>

          <Button asChild>
            <Link href="/items/new">{t("items.list.create")}</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardContent>
          <Form action="/items" className="mb-6">
            <FieldGroup className="lg:flex-row lg:items-end">
              <Field className="flex-1">
                <FieldLabel htmlFor="q">{t("items.list.search.label")}</FieldLabel>

                <Input
                  defaultValue={query}
                  id="q"
                  name="q"
                  placeholder={t("items.list.search.placeholder")}
                />
              </Field>

              <Field className="lg:w-48">
                <FieldLabel htmlFor="group">{t("items.list.filter.group")}</FieldLabel>

                <NativeSelect defaultValue={group} id="group" name="group">
                  <NativeSelectOption value="">
                    {t("items.list.filter.allGroups")}
                  </NativeSelectOption>

                  {groups.map((itemGroup) => (
                    <NativeSelectOption key={itemGroup.id} value={itemGroup.id}>
                      {itemGroup.code} · {itemGroup.name}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>

              <Field className="lg:w-44">
                <FieldLabel htmlFor="status">{t("items.list.filter.label")}</FieldLabel>

                <NativeSelect defaultValue={status} id="status" name="status">
                  <NativeSelectOption value="ALL">{t("items.list.filter.all")}</NativeSelectOption>

                  <NativeSelectOption value="ACTIVE">{t("items.status.ACTIVE")}</NativeSelectOption>

                  <NativeSelectOption value="INACTIVE">
                    {t("items.status.INACTIVE")}
                  </NativeSelectOption>
                </NativeSelect>
              </Field>

              <Button type="submit">{t("items.list.search.submit")}</Button>
            </FieldGroup>
          </Form>

          {data.items.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>{t("items.list.empty.title")}</EmptyTitle>

                <EmptyDescription>{t("items.list.empty.description")}</EmptyDescription>
              </EmptyHeader>

              <EmptyContent>
                <Button asChild>
                  <Link href="/items/new">{t("items.list.create")}</Link>
                </Button>
              </EmptyContent>
            </Empty>
          ) : (
            <>
              <ItemTable items={data.items} />

              {data.pageCount > 1 && (
                <Pagination className="mt-6">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href={buildHref(Math.max(1, data.page - 1))}
                        text={t("items.list.pagination.previous")}
                      />
                    </PaginationItem>

                    {Array.from({ length: data.pageCount }, (_, index) => index + 1).map(
                      (pageNumber) => (
                        <PaginationItem key={pageNumber}>
                          <PaginationLink
                            href={buildHref(pageNumber)}
                            isActive={pageNumber === data.page}
                          >
                            {pageNumber}
                          </PaginationLink>
                        </PaginationItem>
                      ),
                    )}

                    <PaginationItem>
                      <PaginationNext
                        href={buildHref(Math.min(data.pageCount, data.page + 1))}
                        text={t("items.list.pagination.next")}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
