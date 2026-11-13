import { getTranslations } from "@mqdms/i18n/server";

import { requireAuthContext } from "@/features/auth/session";
import { ItemGroupForm } from "@/features/item-groups/components/item-group-form";
import { getItemGroupOptions, requireItemGroupsAccess } from "@/features/item-groups/server";

/** Yeni ürün grubu oluşturma. */
export default async function NewItemGroupPage() {
  const context = await requireAuthContext();

  await requireItemGroupsAccess("create");

  const t = await getTranslations();

  const groups = await getItemGroupOptions(context.organizationId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("itemGroups.form.create.title")}
        </h1>

        <p className="mt-1 text-sm text-muted-foreground">{t("itemGroups.form.description")}</p>
      </div>

      <div className="max-w-3xl">
        <ItemGroupForm groups={groups} />
      </div>
    </div>
  );
}
