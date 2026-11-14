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

import { canAccess, requireAuthContext } from "@/features/auth/session";
import { MasterProcessTable } from "@/features/master-processes/components/master-process-table";
import {
  getProcessListData,
  requireMasterProcessesAccess,
} from "@/features/master-processes/server";
import { ProcessLibrarySeedButton } from "@/features/process-library-seed/components/process-library-seed-button";

const PAGE_SIZE = 20;

type PageProps = {
  searchParams: Promise<{ q?: string; status?: string; category?: string; page?: string }>;
};

/**
 * Master Process listesi.
 *
 * Organizasyonun ortak proses tanımları listelenir; arama, durum ve kategori
 * filtresi URL state'i üzerinden yürür.
 */
export default async function MasterProcessesPage({ searchParams }: PageProps) {
  const context = await requireAuthContext();

  await requireMasterProcessesAccess("read");

  const params = await searchParams;

  const query = params.q?.trim() ?? "";
  const status = params.status ?? "ALL";
  const category = params.category ?? "";
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);

  const t = await getTranslations();

  const canCreate = await canAccess(context, "masterProcesses", "create");

  const data = await getProcessListData({
    organizationId: context.organizationId,
    query: query || undefined,
    status: status === "ACTIVE" || status === "INACTIVE" ? status : "ALL",
    category:
      category === "MANUFACTURING" ||
      category === "INSPECTION" ||
      category === "ASSEMBLY" ||
      category === "STORAGE" ||
      category === "TRANSPORT" ||
      category === "OUTSOURCED" ||
      category === "PACKAGING" ||
      category === "OTHER"
        ? category
        : undefined,
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

    if (category) {
      search.set("category", category);
    }

    if (targetPage > 1) {
      search.set("page", String(targetPage));
    }

    const queryString = search.toString();

    return queryString ? `/master-processes?${queryString}` : "/master-processes";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("processes.title")}</h1>

          <p className="mt-1 text-sm text-muted-foreground">{t("processes.description")}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {canCreate && <ProcessLibrarySeedButton />}

          <Button asChild variant="outline">
            <Link href="/master-processes/archived">{t("processes.archived.title")}</Link>
          </Button>

          <Button asChild>
            <Link href="/master-processes/new">{t("processes.list.create")}</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardContent>
          <Form action="/master-processes" className="mb-6">
            <FieldGroup className="lg:flex-row lg:items-end">
              <Field className="flex-1">
                <FieldLabel htmlFor="q">{t("processes.list.search.label")}</FieldLabel>

                <Input
                  defaultValue={query}
                  id="q"
                  name="q"
                  placeholder={t("processes.list.search.placeholder")}
                />
              </Field>

              <Field className="lg:w-52">
                <FieldLabel htmlFor="category">{t("processes.list.filter.category")}</FieldLabel>

                <NativeSelect defaultValue={category} id="category" name="category">
                  <NativeSelectOption value="">
                    {t("processes.list.filter.allCategories")}
                  </NativeSelectOption>

                  {(
                    [
                      "MANUFACTURING",
                      "INSPECTION",
                      "ASSEMBLY",
                      "STORAGE",
                      "TRANSPORT",
                      "OUTSOURCED",
                      "PACKAGING",
                      "OTHER",
                    ] as const
                  ).map((value) => (
                    <NativeSelectOption key={value} value={value}>
                      {t(`processes.categories.${value}`)}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>

              <Field className="lg:w-44">
                <FieldLabel htmlFor="status">{t("processes.list.filter.label")}</FieldLabel>

                <NativeSelect defaultValue={status} id="status" name="status">
                  <NativeSelectOption value="ALL">{t("items.list.filter.all")}</NativeSelectOption>

                  <NativeSelectOption value="ACTIVE">{t("items.status.ACTIVE")}</NativeSelectOption>

                  <NativeSelectOption value="INACTIVE">
                    {t("items.status.INACTIVE")}
                  </NativeSelectOption>
                </NativeSelect>
              </Field>

              <Button type="submit">{t("processes.list.search.submit")}</Button>
            </FieldGroup>
          </Form>

          {data.items.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>{t("processes.list.empty.title")}</EmptyTitle>

                <EmptyDescription>{t("processes.list.empty.description")}</EmptyDescription>
              </EmptyHeader>

              <EmptyContent>
                <Button asChild>
                  <Link href="/master-processes/new">{t("processes.list.create")}</Link>
                </Button>
              </EmptyContent>
            </Empty>
          ) : (
            <>
              <MasterProcessTable processes={data.items} />

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
