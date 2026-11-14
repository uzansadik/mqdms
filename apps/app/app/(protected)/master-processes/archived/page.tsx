import { getTranslations } from "@mqdms/i18n/server";
import { Button } from "@mqdms/ui/components/button";
import { Card, CardContent } from "@mqdms/ui/components/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@mqdms/ui/components/empty";
import Link from "next/link";

import { requireAuthContext } from "@/features/auth/session";
import { MasterProcessTable } from "@/features/master-processes/components/master-process-table";
import {
  getProcessListData,
  requireMasterProcessesAccess,
} from "@/features/master-processes/server";

const PAGE_SIZE = 20;

type PageProps = {
  searchParams: Promise<{ page?: string }>;
};

/** Arşivlenen Master Process listesi. */
export default async function ArchivedMasterProcessesPage({ searchParams }: PageProps) {
  const context = await requireAuthContext();

  await requireMasterProcessesAccess("read");

  const params = await searchParams;

  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);

  const t = await getTranslations();

  const data = await getProcessListData({
    organizationId: context.organizationId,
    archived: true,
    page,
    pageSize: PAGE_SIZE,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("processes.archived.title")}</h1>

          <p className="mt-1 text-sm text-muted-foreground">
            {t("processes.archived.description")}
          </p>
        </div>

        <Button asChild variant="outline">
          <Link href="/master-processes">{t("processes.list.back")}</Link>
        </Button>
      </div>

      <Card>
        <CardContent>
          {data.items.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>{t("processes.archived.empty.title")}</EmptyTitle>

                <EmptyDescription>{t("processes.archived.empty.description")}</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <MasterProcessTable processes={data.items} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
