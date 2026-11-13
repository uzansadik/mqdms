import { getTranslations } from "@mqdms/i18n/server";

import { requireAuthContext } from "@/features/auth/session";
import { ItemForm } from "@/features/items/components/item-form";
import { getItemFormOptions, requireItemsAccess } from "@/features/items/server";

/** Yeni ürün oluşturma. */
export default async function NewItemPage() {
  const context = await requireAuthContext();

  await requireItemsAccess("create");

  const t = await getTranslations();

  const options = await getItemFormOptions(context.organizationId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("items.form.create.title")}</h1>

        <p className="mt-1 text-sm text-muted-foreground">{t("items.form.description")}</p>
      </div>

      <div className="max-w-3xl">
        <ItemForm groups={options.groups} units={options.units} />
      </div>
    </div>
  );
}
