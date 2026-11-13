import { getTranslations } from "@mqdms/i18n/server";
import { notFound } from "next/navigation";

import { requireAuthContext } from "@/features/auth/session";
import { ProjectForm } from "@/features/projects/components/project-form";
import { getProject } from "@/features/projects/repository";
import { getProjectFormOptions, requireProjectsAccess } from "@/features/projects/server";

type PageProps = {
  params: Promise<{ id: string }>;
};

/** Proje düzenleme. */
export default async function EditProjectPage({ params }: PageProps) {
  const context = await requireAuthContext();

  await requireProjectsAccess("update");

  const { id } = await params;

  const record = await getProject(context.organizationId, id);

  if (!record) {
    notFound();
  }

  const t = await getTranslations();

  const options = await getProjectFormOptions(context.organizationId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("projects.form.edit.title")}</h1>

        <p className="mt-1 text-sm text-muted-foreground">{t("projects.form.description")}</p>
      </div>

      <div className="max-w-3xl">
        <ProjectForm
          customers={options.customers}
          members={options.members}
          mode="edit"
          plants={options.plants}
          project={{
            id: record.id,
            customerId: record.customerId,
            customerSiteId: record.customerSiteId,
            code: record.code,
            name: record.name,
            customerProjectCode: record.customerProjectCode,
            description: record.description,
            status: record.status,
            projectManagerMemberId: record.projectManagerMemberId,
            startDate: record.startDate,
            targetCompletionDate: record.targetCompletionDate,
            actualCompletionDate: record.actualCompletionDate,
          }}
          sites={options.sites}
        />
      </div>
    </div>
  );
}
