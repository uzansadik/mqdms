import { getTranslations } from "@mqdms/i18n/server";
import { Badge } from "@mqdms/ui/components/badge";
import { Button } from "@mqdms/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@mqdms/ui/components/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@mqdms/ui/components/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@mqdms/ui/components/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@mqdms/ui/components/tabs";
import Link from "next/link";
import { notFound } from "next/navigation";

import { requireAuthContext } from "@/features/auth/session";
import { CustomerItemForm } from "@/features/customer-items/components/customer-item-form";
import { CustomerItemList } from "@/features/customer-items/components/customer-item-list";
import {
  listCustomerItemRevisions,
  listCustomerItemsByItem,
} from "@/features/customer-items/repository";
import { listCustomerOptions } from "@/features/customers/repository";
import { ItemRevisionActions } from "@/features/items/components/item-revision-actions";
import { ItemRevisionForm } from "@/features/items/components/item-revision-form";
import { listItemRevisions } from "@/features/items/repository";
import { getItemDetailData, requireItemsAccess } from "@/features/items/server";
import { StatusBadge } from "@/features/shared/status-badge";

type PageProps = {
  params: Promise<{ id: string }>;
};

/**
 * Ürün detayı.
 *
 * Sekmeler: genel bakış, revision'lar, müşteri referansları, BOM'lar,
 * kullanım ve projeler.
 */
export default async function ItemDetailPage({ params }: PageProps) {
  const context = await requireAuthContext();

  await requireItemsAccess("read");

  const { id } = await params;

  const data = await getItemDetailData(context.organizationId, id);

  if (!data) {
    notFound();
  }

  const t = await getTranslations();

  const [customerItems, customers, internalRevisions] = await Promise.all([
    listCustomerItemsByItem(context.organizationId, id),
    listCustomerOptions(context.organizationId),
    listItemRevisions(context.organizationId, id),
  ]);

  const revisions = Object.fromEntries(
    await Promise.all(
      customerItems.map(async (customerItem) => [
        customerItem.id,
        await listCustomerItemRevisions(context.organizationId, customerItem.id),
      ]),
    ),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{data.item.name}</h1>

            <StatusBadge label={t(`items.status.${data.item.status}`)} status={data.item.status} />

            {data.item.archivedAt && <Badge variant="outline">{t("items.archived.badge")}</Badge>}
          </div>

          <p className="mt-1 text-sm text-muted-foreground">{data.item.code}</p>
        </div>

        <Button asChild variant="outline">
          <Link href={`/items/${data.item.id}/edit`}>{t("items.actions.edit")}</Link>
        </Button>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">{t("items.detail.tabs.overview")}</TabsTrigger>

          <TabsTrigger value="revisions">{t("items.detail.tabs.revisions")}</TabsTrigger>

          <TabsTrigger value="customerReferences">
            {t("items.detail.tabs.customerReferences")}
          </TabsTrigger>

          <TabsTrigger value="boms">{t("items.detail.tabs.boms")}</TabsTrigger>

          <TabsTrigger value="usedIn">{t("items.detail.tabs.usedIn")}</TabsTrigger>

          <TabsTrigger value="projects">{t("items.detail.tabs.projects")}</TabsTrigger>
        </TabsList>

        <TabsContent className="mt-4 space-y-4" value="overview">
          <Card>
            <CardHeader>
              <CardTitle>{t("items.detail.overview.title")}</CardTitle>
            </CardHeader>

            <CardContent>
              <dl className="grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-sm text-muted-foreground">
                    {t("items.form.itemType.label")}
                  </dt>

                  <dd className="text-sm">{t(`items.itemType.${data.item.itemType}`)}</dd>
                </div>

                <div>
                  <dt className="text-sm text-muted-foreground">
                    {t("items.form.supplyType.label")}
                  </dt>

                  <dd className="text-sm">
                    {data.item.supplyType
                      ? t(`items.supplyType.${data.item.supplyType}`)
                      : t("items.form.supplyType.none")}
                  </dd>
                </div>

                <div className="sm:col-span-2">
                  <dt className="text-sm text-muted-foreground">
                    {t("items.form.description.label")}
                  </dt>

                  <dd className="text-sm whitespace-pre-line">{data.item.description ?? "-"}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent className="mt-4 space-y-4" value="revisions">
          <Card>
            <CardHeader>
              <CardTitle>{t("items.detail.revisions.title")}</CardTitle>
            </CardHeader>

            <CardContent>
              {data.revisions.length === 0 ? (
                <Empty>
                  <EmptyHeader>
                    <EmptyTitle>{t("items.detail.revisions.empty.title")}</EmptyTitle>

                    <EmptyDescription>
                      {t("items.detail.revisions.empty.description")}
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("items.detail.revisions.columns.revision")}</TableHead>

                      <TableHead>{t("items.detail.revisions.columns.status")}</TableHead>

                      <TableHead>{t("items.detail.revisions.columns.description")}</TableHead>

                      <TableHead className="text-right">
                        {t("items.list.columns.actions")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {data.revisions.map((revision) => (
                      <TableRow key={revision.id}>
                        <TableCell className="font-medium">{revision.revision}</TableCell>

                        <TableCell>
                          {t(`customerItems.revisions.status.${revision.status}`)}
                        </TableCell>

                        <TableCell>{revision.description ?? "-"}</TableCell>

                        <TableCell className="text-right">
                          <ItemRevisionActions
                            released={revision.status === "RELEASED"}
                            revisionId={revision.id}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <ItemRevisionForm itemId={data.item.id} />
        </TabsContent>

        <TabsContent className="mt-4 space-y-4" value="customerReferences">
          {customerItems.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>{t("customerItems.empty.title")}</EmptyTitle>

                <EmptyDescription>{t("customerItems.empty.description")}</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <CustomerItemList
              customerItems={customerItems}
              internalRevisions={internalRevisions}
              revisions={revisions}
            />
          )}

          <CustomerItemForm customers={customers} itemId={data.item.id} />
        </TabsContent>

        <TabsContent className="mt-4 space-y-4" value="boms">
          <Card>
            <CardHeader>
              <CardTitle>{t("items.detail.boms.title")}</CardTitle>
            </CardHeader>

            <CardContent>
              {data.boms.length === 0 ? (
                <Empty>
                  <EmptyHeader>
                    <EmptyTitle>{t("items.detail.boms.empty.title")}</EmptyTitle>

                    <EmptyDescription>{t("items.detail.boms.empty.description")}</EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("boms.list.columns.code")}</TableHead>

                      <TableHead>{t("boms.list.columns.name")}</TableHead>

                      <TableHead>{t("boms.list.columns.status")}</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {data.boms.map((bom) => (
                      <TableRow key={bom.id}>
                        <TableCell className="font-medium">
                          <Link className="hover:underline" href={`/boms/${bom.id}`}>
                            {bom.code}
                          </Link>
                        </TableCell>

                        <TableCell>{bom.name}</TableCell>

                        <TableCell>
                          <StatusBadge
                            label={t(`items.status.${bom.status}`)}
                            status={bom.status}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent className="mt-4 space-y-4" value="usedIn">
          <Card>
            <CardHeader>
              <CardTitle>{t("items.detail.usedIn.boms.title")}</CardTitle>
            </CardHeader>

            <CardContent>
              {data.usedInBoms.length === 0 ? (
                <Empty>
                  <EmptyHeader>
                    <EmptyTitle>{t("items.detail.usedIn.empty.title")}</EmptyTitle>

                    <EmptyDescription>
                      {t("items.detail.usedIn.empty.description")}
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("boms.list.columns.code")}</TableHead>

                      <TableHead>{t("boms.list.columns.name")}</TableHead>

                      <TableHead>{t("boms.list.columns.currentRevision")}</TableHead>

                      <TableHead>{t("items.detail.usedIn.usage.label")}</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {data.usedInBoms.map((usage) => (
                      <TableRow key={`${usage.bomId}-${usage.revisionId}`}>
                        <TableCell className="font-medium">
                          <Link className="hover:underline" href={`/boms/${usage.bomId}`}>
                            {usage.bomCode}
                          </Link>
                        </TableCell>

                        <TableCell>{usage.bomName}</TableCell>

                        <TableCell>{usage.revision}</TableCell>

                        <TableCell>
                          <Badge variant={usage.usageType === "DIRECT" ? "secondary" : "outline"}>
                            {t(`items.detail.usedIn.usage.${usage.usageType}`)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent className="mt-4 space-y-4" value="projects">
          <Card>
            <CardHeader>
              <CardTitle>{t("items.detail.usedIn.projects.title")}</CardTitle>
            </CardHeader>

            <CardContent>
              {data.usedInProjects.length === 0 ? (
                <Empty>
                  <EmptyHeader>
                    <EmptyTitle>{t("items.detail.usedIn.empty.title")}</EmptyTitle>

                    <EmptyDescription>
                      {t("items.detail.usedIn.empty.description")}
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("projects.list.columns.code")}</TableHead>

                      <TableHead>{t("projects.list.columns.name")}</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {data.usedInProjects.map((project) => (
                      <TableRow key={project.id}>
                        <TableCell className="font-medium">
                          <Link className="hover:underline" href={`/projects/${project.id}`}>
                            {project.code}
                          </Link>
                        </TableCell>

                        <TableCell>{project.name}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
