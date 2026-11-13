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
import { ItemGroupTable } from "@/features/item-groups/components/item-group-table";
import { getItemGroupListData, requireItemGroupsAccess } from "@/features/item-groups/server";

const PAGE_SIZE = 20;

type PageProps = {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
};

/** Ürün grubu listesi. */
export default async function ItemGroupsPage({ searchParams }: PageProps) {
  const context = await requireAuthContext();

  await requireItemGroupsAccess("read");

  const params = await searchParams;

  const query = params.q?.trim() ?? "";
  const status = params.status ?? "ALL";
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);

  const t = await getTranslations();

  const data = await getItemGroupListData({
    organizationId: context.organizationId,
    query: query || undefined,
    status: status === "ACTIVE" || status === "INACTIVE" ? status : "ALL",
    archived: false,
    page,
    pageSize: PAGE_SIZE,
  });

  const buildHref = (targetPage: number) => {
    const search = new URLSearchParams();

    if (query) {
      search.set("q", query);
    }

    if (status !== "ALL") {
      search.set("status", status);
    }

    if (targetPage > 1) {
      search.set("page", String(targetPage));
    }

    const queryString = search.toString();

    return queryString ? `/item-groups?${queryString}` : "/item-groups";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("itemGroups.title")}</h1>

          <p className="mt-1 text-sm text-muted-foreground">{t("itemGroups.description")}</p>
        </div>

        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/item-groups/archived">{t("itemGroups.archived.title")}</Link>
          </Button>

          <Button asChild>
            <Link href="/item-groups/new">{t("itemGroups.list.create")}</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardContent>
          <Form action="/item-groups" className="mb-6">
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

              <Field className="sm:w-44">
                <FieldLabel htmlFor="status">{t("itemGroups.list.filter.label")}</FieldLabel>

                <NativeSelect defaultValue={status} id="status" name="status">
                  <NativeSelectOption value="ALL">
                    {t("itemGroups.list.filter.all")}
                  </NativeSelectOption>

                  <NativeSelectOption value="ACTIVE">{t("items.status.ACTIVE")}</NativeSelectOption>

                  <NativeSelectOption value="INACTIVE">
                    {t("items.status.INACTIVE")}
                  </NativeSelectOption>
                </NativeSelect>
              </Field>

              <Button type="submit">{t("itemGroups.list.search.submit")}</Button>
            </FieldGroup>
          </Form>

          {data.items.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>{t("itemGroups.list.empty.title")}</EmptyTitle>

                <EmptyDescription>{t("itemGroups.list.empty.description")}</EmptyDescription>
              </EmptyHeader>

              <EmptyContent>
                <Button asChild>
                  <Link href="/item-groups/new">{t("itemGroups.list.create")}</Link>
                </Button>
              </EmptyContent>
            </Empty>
          ) : (
            <>
              <ItemGroupTable items={data.items} />

              {data.pageCount > 1 && (
                <Pagination className="mt-6">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href={buildHref(Math.max(1, data.page - 1))}
                        text={t("itemGroups.list.pagination.previous")}
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
                        text={t("itemGroups.list.pagination.next")}
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
