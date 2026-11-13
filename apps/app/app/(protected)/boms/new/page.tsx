import { getTranslations } from "@mqdms/i18n/server";

import { requireAuthContext } from "@/features/auth/session";
import { BomForm } from "@/features/boms/components/bom-form";
import { getBomFormOptions, requireBomsAccess } from "@/features/boms/server";

/** Yeni BOM oluşturma. */
export default async function NewBomPage() {
  const context = await requireAuthContext();

  await requireBomsAccess("create");

  const t = await getTranslations();

  const options = await getBomFormOptions(context.organizationId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("boms.form.create.title")}</h1>

        <p className="mt-1 text-sm text-muted-foreground">{t("boms.form.description")}</p>
      </div>

      <div className="max-w-3xl">
        <BomForm items={options.items} />
      </div>
    </div>
  );
}
