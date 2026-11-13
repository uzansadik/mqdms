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
import { analyzeProductStructure } from "@/features/product-structure/analysis";
import { ProductStructurePanel } from "@/features/product-structure/components/product-structure-panel";
import { ProjectItemForm } from "@/features/project-items/components/project-item-form";
import {
  getCustomerItemOptions,
  getProjectItemFormOptions,
  getProjectItemListData,
} from "@/features/project-items/server";
import { ProjectMemberActions } from "@/features/projects/components/project-member-actions";
import { ProjectPlantActions } from "@/features/projects/components/project-plant-actions";
import { ProjectPlantsForm } from "@/features/projects/components/project-plants-form";
import { ProjectTeamForm } from "@/features/projects/components/project-team-form";
import {
  getProjectDetailData,
  getProjectFormOptions,
  requireProjectsAccess,
} from "@/features/projects/server";
import { StatusBadge } from "@/features/shared/status-badge";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ structure?: string }>;
};

/**
 * Proje detayı.
 *
 * Sekmeler: genel bakış, ekip ve tesisler.
 */
export default async function ProjectDetailPage({ params, searchParams }: PageProps) {
  const context = await requireAuthContext();

  await requireProjectsAccess("read");

  const { id } = await params;

  const data = await getProjectDetailData(context.organizationId, id);

  if (!data) {
    notFound();
  }

  const options = await getProjectFormOptions(context.organizationId);

  const [projectItems, projectItemOptions] = await Promise.all([
    getProjectItemListData(context.organizationId, id),
    getProjectItemFormOptions(context.organizationId),
  ]);

  /*
   * Müşteri ürün referansları seçilen ürüne göre süzülür; formda yalnızca
   * projenin müşterisine ait olanlar gösterilir.
   */
  const customerItemOptions = data.customer
    ? await getCustomerItemOptions(context.organizationId, data.customer.id)
    : [];

  /*
   * Ürün ağacı analizi, projedeki deliverable'ların BOM revision'ları
   * üzerinden yapılır. Seçim yapılmadıysa analiz çalıştırılmaz.
   */
  const structureParams = await searchParams;

  const deliverableBomRevisions = projectItems
    .filter((projectItem) => projectItem.itemRole === "DELIVERABLE" && projectItem.bomRevisionId)
    .map((projectItem) => ({
      id: projectItem.bomRevisionId as string,
      label: `${projectItem.itemCode ?? ""} · ${projectItem.itemName ?? ""}`,
    }));

  const selectedStructureId = structureParams.structure ?? null;

  const structureAnalysis =
    selectedStructureId && deliverableBomRevisions.some((r) => r.id === selectedStructureId)
      ? await analyzeProductStructure(context.organizationId, selectedStructureId)
      : null;

  const t = await getTranslations();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{data.project.name}</h1>

            <StatusBadge
              label={t(`projects.status.${data.project.status}`)}
              status={data.project.status}
            />

            {data.project.archivedAt && (
              <Badge variant="outline">{t("projects.archived.badge")}</Badge>
            )}
          </div>

          <p className="mt-1 text-sm text-muted-foreground">
            {data.project.code}
            {data.customer ? ` · ${data.customer.name}` : ""}
          </p>
        </div>

        <Button asChild variant="outline">
          <Link href={`/projects/${data.project.id}/edit`}>{t("projects.actions.edit")}</Link>
        </Button>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">{t("projects.detail.tabs.overview")}</TabsTrigger>

          <TabsTrigger value="team">{t("projects.detail.tabs.team")}</TabsTrigger>

          <TabsTrigger value="plants">{t("projects.detail.tabs.plants")}</TabsTrigger>

          <TabsTrigger value="items">{t("projects.detail.tabs.items")}</TabsTrigger>

          <TabsTrigger value="structure">{t("projects.detail.tabs.structure")}</TabsTrigger>
        </TabsList>

        <TabsContent className="mt-4 space-y-4" value="overview">
          <Card>
            <CardHeader>
              <CardTitle>{t("projects.detail.overview.title")}</CardTitle>
            </CardHeader>

            <CardContent>
              <dl className="grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-sm text-muted-foreground">
                    {t("projects.form.customer.label")}
                  </dt>

                  <dd className="text-sm">
                    {data.customer ? (
                      <Link className="hover:underline" href={`/customers/${data.customer.id}`}>
                        {data.customer.name}
                      </Link>
                    ) : (
                      "-"
                    )}
                  </dd>
                </div>

                <div>
                  <dt className="text-sm text-muted-foreground">
                    {t("projects.form.customerProjectCode.label")}
                  </dt>

                  <dd className="text-sm">{data.project.customerProjectCode ?? "-"}</dd>
                </div>

                <div>
                  <dt className="text-sm text-muted-foreground">
                    {t("projects.form.manager.label")}
                  </dt>

                  <dd className="text-sm">
                    {options.members.find(
                      (member) => member.id === data.project.projectManagerMemberId,
                    )?.name ?? t("projects.form.manager.none")}
                  </dd>
                </div>

                <div>
                  <dt className="text-sm text-muted-foreground">
                    {t("projects.form.startDate.label")}
                  </dt>

                  <dd className="text-sm">{data.project.startDate ?? "-"}</dd>
                </div>

                <div>
                  <dt className="text-sm text-muted-foreground">
                    {t("projects.form.targetCompletionDate.label")}
                  </dt>

                  <dd className="text-sm">{data.project.targetCompletionDate ?? "-"}</dd>
                </div>

                <div>
                  <dt className="text-sm text-muted-foreground">
                    {t("projects.form.actualCompletionDate.label")}
                  </dt>

                  <dd className="text-sm">{data.project.actualCompletionDate ?? "-"}</dd>
                </div>

                <div className="sm:col-span-2">
                  <dt className="text-sm text-muted-foreground">
                    {t("projects.form.description.label")}
                  </dt>

                  <dd className="text-sm whitespace-pre-line">{data.project.description ?? "-"}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent className="mt-4 space-y-4" value="team">
          <Card>
            <CardHeader>
              <CardTitle>{t("projects.team.title")}</CardTitle>
            </CardHeader>

            <CardContent>
              {data.members.length === 0 ? (
                <Empty>
                  <EmptyHeader>
                    <EmptyTitle>{t("projects.team.empty.title")}</EmptyTitle>

                    <EmptyDescription>{t("projects.team.empty.description")}</EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("projects.team.form.member.label")}</TableHead>

                      <TableHead>{t("projects.team.form.role.label")}</TableHead>

                      <TableHead>{t("projects.team.form.responsibility.label")}</TableHead>

                      <TableHead className="text-right">
                        {t("projects.list.columns.actions")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {data.members.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell className="font-medium">
                          {member.memberName}
                          <span className="block text-xs text-muted-foreground">
                            {member.memberEmail}
                          </span>
                        </TableCell>

                        <TableCell>{t(`projects.projectRole.${member.projectRole}`)}</TableCell>

                        <TableCell>{member.responsibility ?? "-"}</TableCell>

                        <TableCell className="text-right">
                          <ProjectMemberActions
                            memberId={member.memberId}
                            projectId={data.project.id}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <ProjectTeamForm
            existingMemberIds={data.members.map((member) => member.memberId)}
            members={options.members}
            projectId={data.project.id}
          />
        </TabsContent>

        <TabsContent className="mt-4 space-y-4" value="plants">
          <Card>
            <CardHeader>
              <CardTitle>{t("projects.plants.title")}</CardTitle>
            </CardHeader>

            <CardContent>
              {data.plants.length === 0 ? (
                <Empty>
                  <EmptyHeader>
                    <EmptyTitle>{t("projects.plants.empty.title")}</EmptyTitle>

                    <EmptyDescription>{t("projects.plants.empty.description")}</EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("plants.list.columns.code")}</TableHead>

                      <TableHead>{t("plants.list.columns.name")}</TableHead>

                      <TableHead>{t("projects.plants.form.isPrimary.label")}</TableHead>

                      <TableHead className="text-right">
                        {t("projects.list.columns.actions")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {data.plants.map((projectPlant) => (
                      <TableRow key={projectPlant.id}>
                        <TableCell className="font-medium">{projectPlant.plantCode}</TableCell>

                        <TableCell>
                          <Link
                            className="hover:underline"
                            href={`/plants/${projectPlant.plantId}`}
                          >
                            {projectPlant.plantName}
                          </Link>
                        </TableCell>

                        <TableCell>
                          {projectPlant.isPrimary ? (
                            <Badge variant="default">
                              {t("projects.plants.form.isPrimary.label")}
                            </Badge>
                          ) : (
                            "-"
                          )}
                        </TableCell>

                        <TableCell className="text-right">
                          <ProjectPlantActions
                            plantId={projectPlant.plantId}
                            projectId={data.project.id}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <ProjectPlantsForm
            assignedPlantIds={data.plants.map((projectPlant) => projectPlant.plantId)}
            hasPrimary={data.plants.some((projectPlant) => projectPlant.isPrimary)}
            plants={options.plants}
            projectId={data.project.id}
          />
        </TabsContent>

        <TabsContent className="mt-4 space-y-4" value="items">
          <Card>
            <CardHeader>
              <CardTitle>{t("projectItems.title")}</CardTitle>
            </CardHeader>

            <CardContent>
              {projectItems.length === 0 ? (
                <Empty>
                  <EmptyHeader>
                    <EmptyTitle>{t("projectItems.empty.title")}</EmptyTitle>

                    <EmptyDescription>{t("projectItems.empty.description")}</EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("projectItems.list.columns.item")}</TableHead>

                      <TableHead>{t("projectItems.list.columns.role")}</TableHead>

                      <TableHead>{t("projectItems.list.columns.customerPartNumber")}</TableHead>

                      <TableHead>{t("projectItems.list.columns.revision")}</TableHead>

                      <TableHead>{t("projectItems.list.columns.supplyType")}</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {projectItems.map((projectItem) => (
                      <TableRow key={projectItem.id}>
                        <TableCell className="font-medium">
                          {projectItem.itemCode ?? "-"}
                          <span className="block text-xs text-muted-foreground">
                            {projectItem.itemName ?? ""}
                          </span>
                        </TableCell>

                        <TableCell>{t(`projectItems.role.${projectItem.itemRole}`)}</TableCell>

                        <TableCell>{projectItem.customerPartNumber ?? "-"}</TableCell>

                        <TableCell>
                          {projectItem.itemRevision ?? projectItem.customerRevision ?? "-"}
                        </TableCell>

                        <TableCell>
                          {projectItem.supplyTypeOverride
                            ? t(`items.supplyType.${projectItem.supplyTypeOverride}`)
                            : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <ProjectItemForm
            bomRevisions={projectItemOptions.bomRevisions}
            customerId={data.project.customerId}
            customerItems={customerItemOptions}
            itemRevisions={projectItemOptions.itemRevisions}
            items={projectItemOptions.items}
            projectId={data.project.id}
          />
        </TabsContent>

        <TabsContent className="mt-4 space-y-4" value="structure">
          <ProductStructurePanel
            analysis={structureAnalysis}
            path={`/projects/${data.project.id}`}
            bomRevisions={deliverableBomRevisions}
            selectedId={selectedStructureId}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
