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
import { ProjectTable } from "@/features/projects/components/project-table";
import { getProjectListData, requireProjectsAccess } from "@/features/projects/server";

const PAGE_SIZE = 20;

const PROJECT_STATUSES = ["DRAFT", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"] as const;

type PageProps = {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
};

/** Proje listesi. */
export default async function ProjectsPage({ searchParams }: PageProps) {
  const context = await requireAuthContext();

  await requireProjectsAccess("read");

  const params = await searchParams;

  const query = params.q?.trim() ?? "";
  const status = params.status ?? "ALL";
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);

  const t = await getTranslations();

  const data = await getProjectListData({
    organizationId: context.organizationId,
    query: query || undefined,
    status: PROJECT_STATUSES.find((item) => item === status) ?? "ALL",
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

    return queryString ? `/projects?${queryString}` : "/projects";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("projects.title")}</h1>

          <p className="mt-1 text-sm text-muted-foreground">{t("projects.description")}</p>
        </div>

        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/projects/archived">{t("projects.archived.title")}</Link>
          </Button>

          <Button asChild>
            <Link href="/projects/new">{t("projects.list.create")}</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardContent>
          <Form action="/projects" className="mb-6">
            <FieldGroup className="sm:flex-row sm:items-end">
              <Field className="flex-1">
                <FieldLabel htmlFor="q">{t("projects.list.search.label")}</FieldLabel>

                <Input
                  defaultValue={query}
                  id="q"
                  name="q"
                  placeholder={t("projects.list.search.placeholder")}
                />
              </Field>

              <Field className="sm:w-48">
                <FieldLabel htmlFor="status">{t("projects.list.filter.label")}</FieldLabel>

                <NativeSelect defaultValue={status} id="status" name="status">
                  <NativeSelectOption value="ALL">
                    {t("projects.list.filter.all")}
                  </NativeSelectOption>

                  {PROJECT_STATUSES.map((item) => (
                    <NativeSelectOption key={item} value={item}>
                      {t(`projects.status.${item}`)}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>

              <Button type="submit">{t("projects.list.search.submit")}</Button>
            </FieldGroup>
          </Form>

          {data.items.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>{t("projects.list.empty.title")}</EmptyTitle>

                <EmptyDescription>{t("projects.list.empty.description")}</EmptyDescription>
              </EmptyHeader>

              <EmptyContent>
                <Button asChild>
                  <Link href="/projects/new">{t("projects.list.create")}</Link>
                </Button>
              </EmptyContent>
            </Empty>
          ) : (
            <>
              <ProjectTable items={data.items} />

              {data.pageCount > 1 && (
                <Pagination className="mt-6">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href={buildHref(Math.max(1, data.page - 1))}
                        text={t("projects.list.pagination.previous")}
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
                        text={t("projects.list.pagination.next")}
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
