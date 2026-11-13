import { getTranslations } from "@mqdms/i18n/server";
import { notFound } from "next/navigation";

import { requireAuthContext } from "@/features/auth/session";
import { PlantForm } from "@/features/plants/components/plant-form";
import { getPlant } from "@/features/plants/repository";
import { requirePlantsAccess } from "@/features/plants/server";

type PageProps = {
  params: Promise<{ id: string }>;
};

/** Tesis düzenleme. */
export default async function EditPlantPage({ params }: PageProps) {
  const context = await requireAuthContext();

  await requirePlantsAccess("update");

  const { id } = await params;

  const record = await getPlant(context.organizationId, id);

  if (!record) {
    notFound();
  }

  const t = await getTranslations();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("plants.form.edit.title")}</h1>

        <p className="mt-1 text-sm text-muted-foreground">{t("plants.form.description")}</p>
      </div>

      <div className="max-w-3xl">
        <PlantForm
          plant={{
            id: record.id,
            code: record.code,
            name: record.name,
            description: record.description,
            countryCode: record.countryCode,
            city: record.city,
            address: record.address,
            postalCode: record.postalCode,
            timezone: record.timezone,
            status: record.status,
          }}
        />
      </div>
    </div>
  );
}
