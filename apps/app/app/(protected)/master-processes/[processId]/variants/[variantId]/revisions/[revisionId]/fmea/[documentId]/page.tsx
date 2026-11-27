import { getTranslations } from "@mqdms/i18n/server";
import { Badge } from "@mqdms/ui/components/badge";
import { Button } from "@mqdms/ui/components/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@mqdms/ui/components/tabs";
import { FileSpreadsheet, Printer } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { canAccess, requireAuthContext } from "@/features/auth/session";
import { FmeaActionPanel } from "@/features/fmea/components/fmea-action-panel";
import { FmeaDocumentActions } from "@/features/fmea/components/fmea-document-actions";
import { FmeaFailureGrid } from "@/features/fmea/components/fmea-failure-grid";
import { FmeaFunctionPanel } from "@/features/fmea/components/fmea-function-panel";
import { FmeaSpecialCharacteristicPanel } from "@/features/fmea/components/fmea-special-characteristic-panel";
import { FmeaStructurePanel } from "@/features/fmea/components/fmea-structure-panel";
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
 * FMEA belgesi detayı.
 *
 * Yedi adımın çıktısı sekmeler halinde gösterilir: yapı analizi, fonksiyon
 * analizi, hata analizi, aksiyonlar ve özel karakteristikler.
 */
export default async function FmeaDocumentPage({ params }: PageProps) {
  const context = await requireAuthContext();

  await requireFmeaAccess("read");

  const { processId, variantId, revisionId, documentId } = await params;

  const data = await getFmeaDocumentDetailData(context.organizationId, documentId);

  if (!data) {
    notFound();
  }

  const [canSubmit, canApprove, canReject] = await Promise.all([
    canAccess(context, "fmea", "submit"),
    canAccess(context, "fmea", "approve"),
    canAccess(context, "fmea", "reject"),
  ]);

  const t = await getTranslations();

  const baseHref = `/master-processes/${processId}/variants/${variantId}/revisions/${revisionId}/fmea/${documentId}`;

  /*
   * Hata analizi ağacı sunucuda kurulur: Action Priority ve risk sınıfı
   * hesapları istemci ve sunucuda aynı sonucu vermelidir.
   */
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

  const structureOptions = data.structureElements.map((element) => ({
    id: element.id,
    label: `${element.code} — ${element.name}`,
  }));

  const functionOptions = data.functions.map((entry) => ({
    id: entry.id,
    label: entry.name,
  }));

  const failureModeOptions = data.failureModes.map((mode) => ({
    id: mode.id,
    label: mode.failureMode,
  }));

  const editable = data.document.status === "DRAFT";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{data.document.code}</h1>

            <Badge variant="outline">{t(`fmea.type.${data.document.fmeaType}`)}</Badge>

            <Badge
              variant={
                data.document.status === "RELEASED"
                  ? "default"
                  : data.document.status === "DRAFT"
                    ? "secondary"
                    : "outline"
              }
            >
              {t(`fmea.status.${data.document.status}`)}
            </Badge>
          </div>

          <p className="mt-1 text-sm text-muted-foreground">{data.document.name}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline">
            <Link href={`${baseHref}/print`}>
              <Printer />

              {t("fmea.actions.print")}
            </Link>
          </Button>

          <Button asChild variant="outline">
            <Link href={`${baseHref}/export`}>
              <FileSpreadsheet />

              {t("fmea.actions.export")}
            </Link>
          </Button>

          <FmeaDocumentActions
            canApprove={canApprove}
            canReject={canReject}
            canSubmit={canSubmit}
            documentId={documentId}
            status={data.document.status}
          />
        </div>
      </div>

      <Tabs defaultValue="structure">
        <TabsList>
          <TabsTrigger value="structure">{t("fmea.tabs.structure")}</TabsTrigger>

          <TabsTrigger value="functions">{t("fmea.tabs.functions")}</TabsTrigger>

          <TabsTrigger value="failures">{t("fmea.tabs.failures")}</TabsTrigger>

          <TabsTrigger value="actions">{t("fmea.tabs.actions")}</TabsTrigger>

          <TabsTrigger value="characteristics">{t("fmea.tabs.characteristics")}</TabsTrigger>
        </TabsList>

        <TabsContent className="mt-4 space-y-4" value="structure">
          <FmeaStructurePanel
            documentId={documentId}
            editable={editable}
            elements={data.structureElements.map((element) => ({
              id: element.id,
              parentId: element.parentId,
              code: element.code,
              name: element.name,
              description: element.description,
              level: element.level,
              isSpecialCharacteristic: element.isSpecialCharacteristic,
              flowNodeId: element.flowNodeId,
              itemId: element.itemId,
            }))}
            fmeaType={data.document.fmeaType}
          />
        </TabsContent>

        <TabsContent className="mt-4 space-y-4" value="functions">
          <FmeaFunctionPanel
            documentId={documentId}
            editable={editable}
            functions={data.functions.map((entry) => ({
              id: entry.id,
              structureElementId: entry.structureElementId,
              name: entry.name,
              description: entry.description,
              functionAspect: entry.functionAspect,
              requirementText: entry.requirementText,
              isSpecialCharacteristic: entry.isSpecialCharacteristic,
            }))}
            structureElements={structureOptions}
          />
        </TabsContent>

        <TabsContent className="mt-4 space-y-4" value="failures">
          <FmeaFailureGrid
            documentId={documentId}
            editable={editable}
            functions={functionOptions}
            rows={failureRows}
            structureElements={structureOptions}
          />
        </TabsContent>

        <TabsContent className="mt-4 space-y-4" value="actions">
          <FmeaActionPanel
            actions={data.actions.map((action) => ({
              id: action.id,
              failureModeId: action.failureModeId,
              failureCauseId: action.failureCauseId,
              actionType: action.actionType,
              description: action.description,
              responsibleText: action.responsibleText,
              targetDate: action.targetDate,
              status: action.status,
              verificationOfEffectiveness: action.verificationOfEffectiveness,
              isSpecialAction: action.isSpecialAction,
            }))}
            documentId={documentId}
            editable={editable}
            failureModes={failureModeOptions}
          />
        </TabsContent>

        <TabsContent className="mt-4 space-y-4" value="characteristics">
          <FmeaSpecialCharacteristicPanel
            characteristics={data.specialCharacteristics.map((characteristic) => ({
              id: characteristic.id,
              structureElementId: characteristic.structureElementId,
              functionId: characteristic.functionId,
              failureModeId: characteristic.failureModeId,
              characteristicType: characteristic.characteristicType,
              scClass: characteristic.scClass,
              reason: characteristic.reason,
              status: characteristic.status,
            }))}
            documentId={documentId}
            editable={editable}
            failureModes={failureModeOptions}
            structureElements={structureOptions}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
