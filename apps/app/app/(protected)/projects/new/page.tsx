import { getTranslations } from "@mqdms/i18n/server";

import { requireAuthContext } from "@/features/auth/session";
import { ProjectForm } from "@/features/projects/components/project-form";
import { getProjectFormOptions, requireProjectsAccess } from "@/features/projects/server";

/** Yeni proje oluşturma. */
export default async function NewProjectPage() {
  const context = await requireAuthContext();

  await requireProjectsAccess("create");

  const t = await getTranslations();

  const options = await getProjectFormOptions(context.organizationId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("projects.form.create.title")}</h1>

        <p className="mt-1 text-sm text-muted-foreground">{t("projects.form.description")}</p>
      </div>

      <div className="max-w-3xl">
        <ProjectForm
          customers={options.customers}
          members={options.members}
          mode="create"
          plants={options.plants}
          sites={options.sites}
        />
      </div>
    </div>
  );
}
