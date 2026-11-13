import { getTranslations } from "@mqdms/i18n/server";

import { requireAuthContext } from "@/features/auth/session";
import { PlantForm } from "@/features/plants/components/plant-form";
import { requirePlantsAccess } from "@/features/plants/server";

/** Yeni tesis oluşturma. */
export default async function NewPlantPage() {
  await requireAuthContext();

  await requirePlantsAccess("create");

  const t = await getTranslations();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("plants.form.create.title")}</h1>

        <p className="mt-1 text-sm text-muted-foreground">{t("plants.form.description")}</p>
      </div>

      <div className="max-w-3xl">
        <PlantForm />
      </div>
    </div>
  );
}
