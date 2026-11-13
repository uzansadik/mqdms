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
import Link from "next/link";
import { notFound } from "next/navigation";

import { requireAuthContext } from "@/features/auth/session";
import { getPlantDetailData, requirePlantsAccess } from "@/features/plants/server";
import { StatusBadge } from "@/features/shared/status-badge";

type PageProps = {
  params: Promise<{ id: string }>;
};

/**
 * Tesis detayı.
 *
 * Tesiste yürütülen projeler listelenir.
 */
export default async function PlantDetailPage({ params }: PageProps) {
  const context = await requireAuthContext();

  await requirePlantsAccess("read");

  const { id } = await params;

  const data = await getPlantDetailData(context.organizationId, id);

  if (!data) {
    notFound();
  }

  const t = await getTranslations();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{data.plant.name}</h1>

            <StatusBadge
              label={t(`plants.status.${data.plant.status}`)}
              status={data.plant.status}
            />

            {data.plant.archivedAt && <Badge variant="outline">{t("plants.archived.badge")}</Badge>}
          </div>

          <p className="mt-1 text-sm text-muted-foreground">{data.plant.code}</p>
        </div>

        <Button asChild variant="outline">
          <Link href={`/plants/${data.plant.id}/edit`}>{t("plants.actions.edit")}</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("plants.detail.title")}</CardTitle>
        </CardHeader>

        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-muted-foreground">{t("plants.form.city.label")}</dt>

              <dd className="text-sm">{data.plant.city ?? "-"}</dd>
            </div>

            <div>
              <dt className="text-sm text-muted-foreground">
                {t("plants.form.countryCode.label")}
              </dt>

              <dd className="text-sm">{data.plant.countryCode ?? "-"}</dd>
            </div>

            <div>
              <dt className="text-sm text-muted-foreground">{t("plants.form.postalCode.label")}</dt>

              <dd className="text-sm">{data.plant.postalCode ?? "-"}</dd>
            </div>

            <div>
              <dt className="text-sm text-muted-foreground">{t("plants.form.timezone.label")}</dt>

              <dd className="text-sm">{data.plant.timezone ?? "-"}</dd>
            </div>

            <div className="sm:col-span-2">
              <dt className="text-sm text-muted-foreground">{t("plants.form.address.label")}</dt>

              <dd className="text-sm">{data.plant.address ?? "-"}</dd>
            </div>

            <div className="sm:col-span-2">
              <dt className="text-sm text-muted-foreground">
                {t("plants.form.description.label")}
              </dt>

              <dd className="text-sm whitespace-pre-line">{data.plant.description ?? "-"}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("plants.detail.projects")}</CardTitle>
        </CardHeader>

        <CardContent>
          {data.projects.length === 0 ? (
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
                  <TableHead>{t("projects.list.columns.code")}</TableHead>

                  <TableHead>{t("projects.list.columns.name")}</TableHead>

                  <TableHead>{t("projects.list.columns.status")}</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {data.projects.map((project) => (
                  <TableRow key={project.id}>
                    <TableCell className="font-medium">
                      <Link className="hover:underline" href={`/projects/${project.id}`}>
                        {project.code}
                      </Link>
                    </TableCell>

                    <TableCell>
                      <Link className="hover:underline" href={`/projects/${project.id}`}>
                        {project.name}
                      </Link>
                    </TableCell>

                    <TableCell>{t(`projects.status.${project.status}`)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
