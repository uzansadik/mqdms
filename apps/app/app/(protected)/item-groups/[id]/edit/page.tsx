import { getTranslations } from "@mqdms/i18n/server";
import { notFound } from "next/navigation";

import { requireAuthContext } from "@/features/auth/session";
import { ItemGroupForm } from "@/features/item-groups/components/item-group-form";
import { getItemGroup } from "@/features/item-groups/repository";
import { getItemGroupOptions, requireItemGroupsAccess } from "@/features/item-groups/server";

type PageProps = {
  params: Promise<{ id: string }>;
};

/** Ürün grubu düzenleme. */
export default async function EditItemGroupPage({ params }: PageProps) {
  const context = await requireAuthContext();

  await requireItemGroupsAccess("update");

  const { id } = await params;

  const record = await getItemGroup(context.organizationId, id);

  if (!record) {
    notFound();
  }

  const t = await getTranslations();

  const groups = await getItemGroupOptions(context.organizationId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("itemGroups.form.edit.title")}</h1>

        <p className="mt-1 text-sm text-muted-foreground">{t("itemGroups.form.description")}</p>
      </div>

      <div className="max-w-3xl">
        <ItemGroupForm
          group={{
            id: record.id,
            code: record.code,
            name: record.name,
            description: record.description,
            parentId: record.parentId,
            sortOrder: record.sortOrder,
            status: record.status,
          }}
          groups={groups}
        />
      </div>
    </div>
  );
}
