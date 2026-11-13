import { getTranslations } from "@mqdms/i18n/server";

import { requireAuthContext } from "@/features/auth/session";
import { CustomerForm } from "@/features/customers/components/customer-form";
import { requireCustomersAccess } from "@/features/customers/server";

/**
 * Yeni müşteri oluşturma.
 *
 * Sayfa koruması `customers:create` yetkisini gerektirir; formun kendi
 * sunucu aksiyonu da aynı yetkiyi ayrıca doğrular.
 */
export default async function NewCustomerPage() {
  const context = await requireAuthContext();

  await requireCustomersAccess("create");

  const t = await getTranslations();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("customers.form.create.title")}
        </h1>

        <p className="mt-1 text-sm text-muted-foreground">{t("customers.form.description")}</p>
      </div>

      <div className="max-w-3xl">
        <CustomerForm />
      </div>

      <p className="text-xs text-muted-foreground">{context.organization.name}</p>
    </div>
  );
}
