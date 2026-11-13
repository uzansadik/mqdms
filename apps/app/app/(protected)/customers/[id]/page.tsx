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
import { CustomerContactForm } from "@/features/customers/components/customer-contact-form";
import { CustomerSiteForm } from "@/features/customers/components/customer-site-form";
import { getCustomerDetailData, requireCustomersAccess } from "@/features/customers/server";
import { StatusBadge } from "@/features/shared/status-badge";

type PageProps = {
  params: Promise<{ id: string }>;
};

/**
 * Müşteri detayı.
 *
 * Sekmeler: genel bakış, siteler, temsilciler ve projeler.
 */
export default async function CustomerDetailPage({ params }: PageProps) {
  const context = await requireAuthContext();

  await requireCustomersAccess("read");

  const { id } = await params;

  const data = await getCustomerDetailData(context.organizationId, id);

  if (!data) {
    notFound();
  }

  const t = await getTranslations();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{data.customer.name}</h1>

            <StatusBadge
              label={t(`customers.status.${data.customer.status}`)}
              status={data.customer.status}
            />

            {data.customer.archivedAt && (
              <Badge variant="outline">{t("customers.archived.badge")}</Badge>
            )}
          </div>

          <p className="mt-1 text-sm text-muted-foreground">
            {data.customer.code}
            {data.customer.legalName ? ` · ${data.customer.legalName}` : ""}
          </p>
        </div>

        <Button asChild variant="outline">
          <Link href={`/customers/${data.customer.id}/edit`}>{t("customers.actions.edit")}</Link>
        </Button>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">{t("customers.detail.tabs.overview")}</TabsTrigger>

          <TabsTrigger value="sites">{t("customers.detail.tabs.sites")}</TabsTrigger>

          <TabsTrigger value="contacts">{t("customers.detail.tabs.contacts")}</TabsTrigger>

          <TabsTrigger value="projects">{t("customers.detail.tabs.projects")}</TabsTrigger>
        </TabsList>

        <TabsContent className="mt-4 space-y-4" value="overview">
          <Card>
            <CardHeader>
              <CardTitle>{t("customers.detail.overview.title")}</CardTitle>
            </CardHeader>

            <CardContent>
              <dl className="grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-sm text-muted-foreground">
                    {t("customers.form.legalName.label")}
                  </dt>

                  <dd className="text-sm">{data.customer.legalName ?? "-"}</dd>
                </div>

                <div>
                  <dt className="text-sm text-muted-foreground">
                    {t("customers.form.countryCode.label")}
                  </dt>

                  <dd className="text-sm">{data.customer.countryCode ?? "-"}</dd>
                </div>

                <div>
                  <dt className="text-sm text-muted-foreground">
                    {t("customers.form.website.label")}
                  </dt>

                  <dd className="text-sm">{data.customer.website ?? "-"}</dd>
                </div>

                <div>
                  <dt className="text-sm text-muted-foreground">
                    {t("customers.form.preferredLanguage.label")}
                  </dt>

                  <dd className="text-sm">{data.customer.preferredLanguage ?? "-"}</dd>
                </div>

                <div className="sm:col-span-2">
                  <dt className="text-sm text-muted-foreground">
                    {t("customers.form.description.label")}
                  </dt>

                  <dd className="text-sm whitespace-pre-line">
                    {data.customer.description ?? "-"}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent className="mt-4 space-y-4" value="sites">
          <Card>
            <CardHeader>
              <CardTitle>{t("customers.sites.title")}</CardTitle>
            </CardHeader>

            <CardContent>
              {data.sites.length === 0 ? (
                <Empty>
                  <EmptyHeader>
                    <EmptyTitle>{t("customers.sites.empty.title")}</EmptyTitle>

                    <EmptyDescription>{t("customers.sites.empty.description")}</EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("customers.sites.form.code.label")}</TableHead>

                      <TableHead>{t("customers.sites.form.name.label")}</TableHead>

                      <TableHead>{t("customers.sites.form.city.label")}</TableHead>

                      <TableHead>{t("customers.sites.form.countryCode.label")}</TableHead>

                      <TableHead>{t("customers.list.columns.status")}</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {data.sites.map((site) => (
                      <TableRow key={site.id}>
                        <TableCell className="font-medium">{site.code}</TableCell>

                        <TableCell>{site.name}</TableCell>

                        <TableCell>{site.city ?? "-"}</TableCell>

                        <TableCell>{site.countryCode ?? "-"}</TableCell>

                        <TableCell>
                          <StatusBadge
                            label={t(`customers.status.${site.status}`)}
                            status={site.status}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <CustomerSiteForm customerId={data.customer.id} />
        </TabsContent>

        <TabsContent className="mt-4 space-y-4" value="contacts">
          <Card>
            <CardHeader>
              <CardTitle>{t("customers.contacts.title")}</CardTitle>
            </CardHeader>

            <CardContent>
              {data.contacts.length === 0 ? (
                <Empty>
                  <EmptyHeader>
                    <EmptyTitle>{t("customers.contacts.empty.title")}</EmptyTitle>

                    <EmptyDescription>{t("customers.contacts.empty.description")}</EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("customers.contacts.form.firstName.label")}</TableHead>

                      <TableHead>{t("customers.contacts.form.jobTitle.label")}</TableHead>

                      <TableHead>{t("customers.contacts.form.email.label")}</TableHead>

                      <TableHead>{t("customers.contacts.form.phone.label")}</TableHead>

                      <TableHead>{t("customers.contacts.form.contactType.label")}</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {data.contacts.map((contact) => (
                      <TableRow key={contact.id}>
                        <TableCell className="font-medium">
                          {contact.firstName} {contact.lastName}
                        </TableCell>

                        <TableCell>{contact.jobTitle ?? "-"}</TableCell>

                        <TableCell>{contact.email ?? "-"}</TableCell>

                        <TableCell>{contact.phone ?? "-"}</TableCell>

                        <TableCell>{t(`customers.contactType.${contact.contactType}`)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <CustomerContactForm
            customerId={data.customer.id}
            sites={data.sites.map((site) => ({ id: site.id, name: site.name }))}
          />
        </TabsContent>

        <TabsContent className="mt-4" value="projects">
          <Card>
            <CardHeader>
              <CardTitle>{t("customers.detail.tabs.projects")}</CardTitle>
            </CardHeader>

            <CardContent>
              {data.projects.length === 0 ? (
                <Empty>
                  <EmptyHeader>
                    <EmptyTitle>{t("customers.projects.empty.title")}</EmptyTitle>

                    <EmptyDescription>{t("customers.projects.empty.description")}</EmptyDescription>
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
