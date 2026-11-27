import { getTranslations } from "@mqdms/i18n/server";

import { requireAuthContext } from "@/features/auth/session";
import { buildFmeaWorkbook, type FmeaExportInput } from "@/features/fmea/export/xlsx";
import { buildFailureTree, flattenFailureTree } from "@/features/fmea/failure-tree";
import { getFmeaDocumentDetailData, requireFmeaAccess } from "@/features/fmea/server";

type RouteContext = {
  params: Promise<{
    processId: string;
    variantId: string;
    revisionId: string;
    documentId: string;
  }>;
};

/**
 * FMEA belgesini Excel'e aktarır.
 *
 * Çalışma kitabı AIAG–VDA form düzenindedir: her sayfa bir analiz
 * adımına karşılık gelir.
 */
export async function GET(_request: Request, context: RouteContext) {
  const authContext = await requireAuthContext();

  await requireFmeaAccess("export");

  const { documentId } = await context.params;

  const data = await getFmeaDocumentDetailData(authContext.organizationId, documentId);

  if (!data) {
    return Response.json({ error: "FMEA belgesi bulunamadı." }, { status: 404 });
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

  const input: FmeaExportInput = {
    header: {
      code: data.document.code,
      name: data.document.name,
      fmeaType: data.document.fmeaType,
      status: data.document.status,
      evaluationMethod: data.document.evaluationMethod,
      scopeDescription: data.document.scopeDescription,
      responsibility: data.document.responsibility,
      targetDate: data.document.targetDate,
    },
    sheets: {
      structure: t("fmea.export.sheets.structure"),
      functions: t("fmea.export.sheets.functions"),
      failures: t("fmea.export.sheets.failures"),
      actions: t("fmea.export.sheets.actions"),
      characteristics: t("fmea.export.sheets.characteristics"),
    },
    structureRows: data.structureElements.map((element) => ({
      code: element.code,
      name: element.name,
      level: element.level,
      special: element.isSpecialCharacteristic,
    })),
    functionRows: data.functions.map((entry) => ({
      element:
        (entry.structureElementId
          ? structureById.get(entry.structureElementId)?.name
          : undefined) ?? "",
      name: entry.name,
      aspect: entry.functionAspect,
      requirement: entry.requirementText,
    })),
    failureRows,
    actions: data.actions.map((action) => ({
      failureMode: action.failureModeId
        ? (modeById.get(action.failureModeId)?.failureMode ?? null)
        : null,
      actionType: action.actionType,
      description: action.description,
      responsible: action.responsibleText,
      targetDate: action.targetDate,
      status: action.status,
      verification: action.verificationOfEffectiveness,
      isSpecialAction: action.isSpecialAction,
    })),
    characteristics: data.specialCharacteristics.map((characteristic) => ({
      target:
        (characteristic.structureElementId
          ? structureById.get(characteristic.structureElementId)?.name
          : undefined) ??
        (characteristic.functionId
          ? (functionById.get(characteristic.functionId)?.name ?? "")
          : characteristic.failureModeId
            ? (modeById.get(characteristic.failureModeId)?.failureMode ?? "")
            : ""),
      characteristicType: characteristic.characteristicType,
      scClass: characteristic.scClass,
      reason: characteristic.reason,
      status: characteristic.status,
    })),
  };

  const workbook = await buildFmeaWorkbook(input);

  const buffer = await workbook.xlsx.writeBuffer();

  return new Response(buffer as ArrayBuffer, {
    headers: {
      "content-disposition": `attachment; filename="${data.document.code}.xlsx"`,
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    },
  });
}
