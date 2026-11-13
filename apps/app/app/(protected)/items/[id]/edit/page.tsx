import { getTranslations } from "@mqdms/i18n/server";
import { notFound } from "next/navigation";

import { requireAuthContext } from "@/features/auth/session";
import { ItemForm } from "@/features/items/components/item-form";
import { getItem } from "@/features/items/repository";
import { getItemFormOptions, requireItemsAccess } from "@/features/items/server";

type PageProps = {
  params: Promise<{ id: string }>;
};

/** Ürün düzenleme. */
export default async function EditItemPage({ params }: PageProps) {
  const context = await requireAuthContext();

  await requireItemsAccess("update");

  const { id } = await params;

  const record = await getItem(context.organizationId, id);

  if (!record) {
    notFound();
  }

  const t = await getTranslations();

  const options = await getItemFormOptions(context.organizationId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("items.form.edit.title")}</h1>

        <p className="mt-1 text-sm text-muted-foreground">{t("items.form.description")}</p>
      </div>

      <div className="max-w-3xl">
        <ItemForm
          groups={options.groups}
          item={{
            id: record.id,
            code: record.code,
            name: record.name,
            description: record.description,
            itemGroupId: record.itemGroupId,
            itemType: record.itemType,
            supplyType: record.supplyType ?? undefined,
            unitOfMeasureId: record.unitOfMeasureId,
            status: record.status,
          }}
          units={options.units}
        />
      </div>
    </div>
  );
}
