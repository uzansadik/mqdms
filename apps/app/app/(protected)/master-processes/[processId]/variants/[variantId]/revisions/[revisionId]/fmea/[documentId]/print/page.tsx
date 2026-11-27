import { getTranslations } from "@mqdms/i18n/server";
import { Badge } from "@mqdms/ui/components/badge";
import { notFound } from "next/navigation";

import { requireAuthContext } from "@/features/auth/session";
import { buildFailureTree, flattenFailureTree } from "@/features/fmea/failure-tree";
import { getFmeaDocumentDetailData, requireFmeaAccess } from "@/features/fmea/server";

type PageProps = {
  params: Promise<{
    processId: string;
    variantId: string;
    revisionId: string;
    documentId: string;
  }>;
};

/**
 * FMEA yazdır görünümü.
 *
 * Sayfa salt okunurdur; etkileşim yoktur. Tablolar yazdır çıktısında
 * sayfa genişliğine sığacak şekilde açılır.
 */
export default async function FmeaDocumentPrintPage({ params }: PageProps) {
  const context = await requireAuthContext();

  await requireFmeaAccess("read");

  const { documentId } = await params;

  const data = await getFmeaDocumentDetailData(context.organizationId, documentId);

  if (!data) {
    notFound();
  }

  const t = await getTranslations();

  const failureRows = flattenFailureTree(
    buildFailureTree({
      structureElements: data.structureElements,
      functions: data.functions,
      failureModes: data.failureModes,
      failureCauses: data.failureCauses,
      controls: data.controls,
      actions: data.actions,
      actionPriorityMatrix: data.actionPriorityMatrix,
      riskClassMatrix: data.riskClassMatrix,
    }),
  );

  const structureById = new Map(data.structureElements.map((element) => [element.id, element]));
  const functionById = new Map(data.functions.map((entry) => [entry.id, entry]));
  const modeById = new Map(data.failureModes.map((mode) => [mode.id, mode]));

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-6 p-4 print:p-0">
      <header className="space-y-1 border-b pb-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{data.document.code}</h1>

          <Badge variant="outline">{t(`fmea.type.${data.document.fmeaType}`)}</Badge>

          <Badge variant="secondary">{t(`fmea.status.${data.document.status}`)}</Badge>
        </div>

        <p className="text-sm text-muted-foreground">{data.document.name}</p>

        <dl className="grid gap-2 pt-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-muted-foreground">{t("fmea.form.responsibility.label")}</dt>

            <dd>{data.document.responsibility ?? "-"}</dd>
          </div>

          <div>
            <dt className="text-muted-foreground">{t("fmea.form.targetDate.label")}</dt>

            <dd>{data.document.targetDate ?? "-"}</dd>
          </div>

          <div>
            <dt className="text-muted-foreground">{t("fmea.form.method.label")}</dt>

            <dd>{t(`fmea.method.${data.document.evaluationMethod}`)}</dd>
          </div>

          <div>
            <dt className="text-muted-foreground">{t("fmea.documents.columns.status")}</dt>

            <dd>{t(`fmea.status.${data.document.status}`)}</dd>
          </div>
        </dl>

        {data.document.scopeDescription ? (
          <p className="pt-2 text-sm whitespace-pre-line">{data.document.scopeDescription}</p>
        ) : null}
      </header>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">{t("fmea.tabs.structure")}</h2>

        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="py-1 pr-3">{t("fmea.structure.columns.code")}</th>

              <th className="py-1 pr-3">{t("fmea.structure.columns.name")}</th>

              <th className="py-1 pr-3">{t("fmea.structure.columns.level")}</th>

              <th className="py-1">{t("fmea.structure.columns.special")}</th>
            </tr>
          </thead>

          <tbody>
            {data.structureElements.map((element) => (
              <tr className="border-b" key={element.id}>
                <td className="py-1 pr-3">{element.code}</td>

                <td className="py-1 pr-3">{element.name}</td>

                <td className="py-1 pr-3">{t(`fmea.structureLevel.${element.level}`)}</td>

                <td className="py-1">{element.isSpecialCharacteristic ? "X" : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">{t("fmea.tabs.functions")}</h2>

        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="py-1 pr-3">{t("fmea.functions.columns.element")}</th>

              <th className="py-1 pr-3">{t("fmea.functions.columns.name")}</th>

              <th className="py-1 pr-3">{t("fmea.functions.columns.aspect")}</th>

              <th className="py-1">{t("fmea.functions.columns.requirement")}</th>
            </tr>
          </thead>

          <tbody>
            {data.functions.map((entry) => (
              <tr className="border-b" key={entry.id}>
                <td className="py-1 pr-3">
                  {entry.structureElementId
                    ? (structureById.get(entry.structureElementId)?.name ?? "")
                    : ""}
                </td>

                <td className="py-1 pr-3">{entry.name}</td>

                <td className="py-1 pr-3">{t(`fmea.functionAspect.${entry.functionAspect}`)}</td>

                <td className="py-1">{entry.requirementText ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">{t("fmea.tabs.failures")}</h2>

        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="border-b text-left">
              <th className="py-1 pr-2">{t("fmea.failures.columns.element")}</th>

              <th className="py-1 pr-2">{t("fmea.failures.columns.function")}</th>

              <th className="py-1 pr-2">{t("fmea.failures.columns.mode")}</th>

              <th className="py-1 pr-2">{t("fmea.failures.columns.effectEnd")}</th>

              <th className="py-1 pr-2">{t("fmea.failures.columns.severity")}</th>

              <th className="py-1 pr-2">{t("fmea.failures.columns.classification")}</th>

              <th className="py-1 pr-2">{t("fmea.failures.columns.cause")}</th>

              <th className="py-1 pr-2">{t("fmea.failures.columns.occurrence")}</th>

              <th className="py-1 pr-2">{t("fmea.failures.columns.prevention")}</th>

              <th className="py-1 pr-2">{t("fmea.failures.columns.detectionControl")}</th>

              <th className="py-1 pr-2">{t("fmea.failures.columns.detection")}</th>

              <th className="py-1 pr-2">{t("fmea.failures.columns.actionPriority")}</th>

              <th className="py-1 pr-2">{t("fmea.failures.columns.riskClass")}</th>
            </tr>
          </thead>

          <tbody>
            {failureRows
              .filter((row) => row.kind === "cause")
              .map((row) => (
                <tr className="border-b" key={row.id}>
                  <td className="py-1 pr-2">{row.elementCode}</td>

                  <td className="py-1 pr-2">{row.functionName ?? ""}</td>

                  <td className="py-1 pr-2">{row.mode ?? ""}</td>

                  <td className="py-1 pr-2">{row.effectEnd ?? ""}</td>

                  <td className="py-1 pr-2">{row.severity ?? ""}</td>

                  <td className="py-1 pr-2">{row.classification ?? ""}</td>

                  <td className="py-1 pr-2">{row.cause ?? ""}</td>

                  <td className="py-1 pr-2">{row.occurrence ?? ""}</td>

                  <td className="py-1 pr-2">{row.prevention ?? ""}</td>

                  <td className="py-1 pr-2">{row.detectionControl ?? ""}</td>

                  <td className="py-1 pr-2">{row.detection ?? ""}</td>

                  <td className="py-1 pr-2">{row.actionPriority ?? ""}</td>

                  <td className="py-1 pr-2">{row.riskClass ?? ""}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">{t("fmea.tabs.actions")}</h2>

        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="py-1 pr-3">{t("fmea.failures.columns.mode")}</th>

              <th className="py-1 pr-3">{t("fmea.actionList.columns.description")}</th>

              <th className="py-1 pr-3">{t("fmea.actionList.columns.responsible")}</th>

              <th className="py-1 pr-3">{t("fmea.actionList.columns.targetDate")}</th>

              <th className="py-1 pr-3">{t("fmea.actionList.columns.status")}</th>

              <th className="py-1">{t("fmea.actionList.columns.verification")}</th>
            </tr>
          </thead>

          <tbody>
            {data.actions.map((action) => (
              <tr className="border-b" key={action.id}>
                <td className="py-1 pr-3">
                  {action.failureModeId
                    ? (modeById.get(action.failureModeId)?.failureMode ?? "")
                    : ""}
                </td>

                <td className="py-1 pr-3">{action.description}</td>

                <td className="py-1 pr-3">{action.responsibleText ?? ""}</td>

                <td className="py-1 pr-3">{action.targetDate ?? ""}</td>

                <td className="py-1 pr-3">{t(`fmea.actionList.status.${action.status}`)}</td>

                <td className="py-1">{action.verificationOfEffectiveness ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">{t("fmea.tabs.characteristics")}</h2>

        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="py-1 pr-3">{t("fmea.characteristics.columns.target")}</th>

              <th className="py-1 pr-3">{t("fmea.characteristics.columns.type")}</th>

              <th className="py-1 pr-3">{t("fmea.characteristics.columns.class")}</th>

              <th className="py-1 pr-3">{t("fmea.characteristics.columns.reason")}</th>

              <th className="py-1">{t("fmea.characteristics.columns.status")}</th>
            </tr>
          </thead>

          <tbody>
            {data.specialCharacteristics.map((characteristic) => (
              <tr className="border-b" key={characteristic.id}>
                <td className="py-1 pr-3">
                  {characteristic.structureElementId
                    ? (structureById.get(characteristic.structureElementId)?.name ?? "")
                    : characteristic.functionId
                      ? (functionById.get(characteristic.functionId)?.name ?? "")
                      : characteristic.failureModeId
                        ? (modeById.get(characteristic.failureModeId)?.failureMode ?? "")
                        : ""}
                </td>

                <td className="py-1 pr-3">
                  {t(`fmea.characteristics.type.${characteristic.characteristicType}`)}
                </td>

                <td className="py-1 pr-3">{characteristic.scClass ?? ""}</td>

                <td className="py-1 pr-3">{characteristic.reason ?? ""}</td>

                <td className="py-1">
                  {t(`fmea.characteristics.status.${characteristic.status}`)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
