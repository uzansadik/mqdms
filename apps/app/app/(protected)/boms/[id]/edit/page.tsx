import { getTranslations } from "@mqdms/i18n/server";
import { notFound } from "next/navigation";

import { requireAuthContext } from "@/features/auth/session";
import { BomForm } from "@/features/boms/components/bom-form";
import { getBom } from "@/features/boms/repository";
import { getBomFormOptions, requireBomsAccess } from "@/features/boms/server";

type PageProps = {
  params: Promise<{ id: string }>;
};

/** BOM düzenleme. */
export default async function EditBomPage({ params }: PageProps) {
  const context = await requireAuthContext();

  await requireBomsAccess("update");

  const { id } = await params;

  const record = await getBom(context.organizationId, id);

  if (!record) {
    notFound();
  }

  const t = await getTranslations();

  const options = await getBomFormOptions(context.organizationId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("boms.form.edit.title")}</h1>

        <p className="mt-1 text-sm text-muted-foreground">{t("boms.form.description")}</p>
      </div>

      <div className="max-w-3xl">
        <BomForm
          bom={{
            id: record.id,
            itemId: record.itemId,
            code: record.code,
            name: record.name,
            description: record.description,
            bomType: record.bomType,
            status: record.status,
          }}
          items={options.items}
        />
      </div>
    </div>
  );
}
