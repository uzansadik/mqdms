import { getTranslations } from "@mqdms/i18n/server";

import { canAccess, requireAuthContext } from "@/features/auth/session";
import { FmeaMatrixEditor } from "@/features/fmea/components/fmea-matrix-editor";
import { getFmeaMatricesData, requireFmeaAccess } from "@/features/fmea/server";

/**
 * FMEA değerlendirme matrisleri ayarı.
 *
 * Action Priority ve risk sınıfı matrisleri, AIAG & VDA el kitabının
 * ücretli bir yayın olması nedeniyle kurum tarafından kalibre edilebilir.
 */
export default async function FmeaSettingsPage() {
  const context = await requireAuthContext();

  await requireFmeaAccess("read");

  const [matrices, canUpdate] = await Promise.all([
    getFmeaMatricesData(context.organizationId),
    canAccess(context, "fmea", "update"),
  ]);

  const t = await getTranslations();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("fmea.settings.title")}</h1>

        <p className="mt-1 text-sm text-muted-foreground">{t("fmea.settings.description")}</p>
      </div>

      <FmeaMatrixEditor
        actionPriorityMatrix={matrices.actionPriorityMatrix}
        editable={canUpdate}
        riskClassMatrix={matrices.riskClassMatrix}
      />
    </div>
  );
}
