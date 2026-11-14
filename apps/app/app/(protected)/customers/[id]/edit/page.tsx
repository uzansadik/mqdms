import { getTranslations } from "@mqdms/i18n/server";
import { getPublicObjectUrl } from "@mqdms/storage/server";
import { notFound } from "next/navigation";

import { requireAuthContext } from "@/features/auth/session";
import { CustomerForm } from "@/features/customers/components/customer-form";
import { getCustomer } from "@/features/customers/repository";
import { requireCustomersAccess } from "@/features/customers/server";

type PageProps = {
  params: Promise<{ id: string }>;
};

/**
 * Müşteri düzenleme.
 *
 * Kayıt bulunamazsa 404 üretilir: başka organizasyonun müşteri id'si
 * bilinçli olarak "bulunamadı" olarak görünür.
 */
export default async function EditCustomerPage({ params }: PageProps) {
  const context = await requireAuthContext();

  await requireCustomersAccess("update");

  const { id } = await params;

  const record = await getCustomer(context.organizationId, id);

  if (!record) {
    notFound();
  }

  const t = await getTranslations();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("customers.form.edit.title")}</h1>

        <p className="mt-1 text-sm text-muted-foreground">{t("customers.form.description")}</p>
      </div>

      <div className="max-w-3xl">
        <CustomerForm
          customer={{
            id: record.id,
            code: record.code,
            name: record.name,
            legalName: record.legalName,
            description: record.description,
            website: record.website,
            countryCode: record.countryCode,
            preferredLanguage: record.preferredLanguage,
            logoKey: record.logoKey,
            status: record.status,
          }}
          logoUrl={record.logoKey ? getPublicObjectUrl(record.logoKey) : null}
        />
      </div>
    </div>
  );
}
