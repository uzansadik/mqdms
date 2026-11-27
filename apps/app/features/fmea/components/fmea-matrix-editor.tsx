"use client";

import { useI18n } from "@mqdms/i18n";
import { Button } from "@mqdms/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@mqdms/ui/components/card";
import { NativeSelect, NativeSelectOption } from "@mqdms/ui/components/native-select";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { saveMatricesAction } from "../actions";
import type { ActionPriority, ActionPriorityRow, RiskClass, RiskClassRow } from "../rating";

type FmeaMatrixEditorProps = {
  actionPriorityMatrix: readonly ActionPriorityRow[];
  riskClassMatrix: readonly RiskClassRow[];
  editable: boolean;
};

/**
 * Değerlendirme matrislerinin ayar ekranı.
 *
 * Action Priority ve risk sınıfı matrisleri, AIAG & VDA el kitabının
 * **ücretli** bir yayın olması nedeniyle kurum tarafından kalibre
 * edilebilir. Varsayılan değerler kaynak kodunda tanımlıdır.
 */
export function FmeaMatrixEditor({
  actionPriorityMatrix,
  riskClassMatrix,
  editable,
}: FmeaMatrixEditorProps) {
  const { t } = useI18n();
  const router = useRouter();

  const [isPending, startTransition] = useTransition();

  const [priorityRows, setPriorityRows] = useState<ActionPriorityRow[]>(
    actionPriorityMatrix.map((row) => ({ ...row })),
  );

  const [riskRows, setRiskRows] = useState<RiskClassRow[]>(
    riskClassMatrix.map((row) => ({ ...row })),
  );

  const severityBands = [...new Set(priorityRows.map((row) => row.severityMin))].sort(
    (a, b) => b - a,
  );
  const occurrenceBands = [...new Set(priorityRows.map((row) => row.occurrenceMin))].sort(
    (a, b) => a - b,
  );
  const detectionBands = [...new Set(priorityRows.map((row) => row.detectionMin))].sort(
    (a, b) => a - b,
  );

  function save() {
    startTransition(async () => {
      const result = await saveMatricesAction({
        actionPriority: priorityRows.map((row) => ({
          severityMin: row.severityMin,
          severityMax: row.severityMax,
          occurrenceMin: row.occurrenceMin,
          occurrenceMax: row.occurrenceMax,
          detectionMin: row.detectionMin,
          detectionMax: row.detectionMax,
          actionPriority: row.actionPriority,
        })),
        riskClass: riskRows.map((row) => ({
          severity: row.severity,
          occurrence: row.occurrence,
          riskClass: row.riskClass,
        })),
      });

      if (!result.success) {
        toast.error(result.error);

        return;
      }

      toast.success(t("common.save"));
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("fmea.settings.actionPriority")}</CardTitle>

          <CardDescription>{t("fmea.settings.description")}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-3">
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="px-3 py-2 text-left">S \ O</th>

                  {occurrenceBands.map((occurrence) => (
                    <th className="px-3 py-2 text-left" key={occurrence}>
                      {occurrence}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {severityBands.map((severity) => (
                  <tr className="border-b" key={severity}>
                    <td className="px-3 py-2 font-medium">{severity}</td>

                    {occurrenceBands.map((occurrence) => {
                      const cell = priorityRows.find(
                        (row) =>
                          row.severityMin === severity &&
                          row.occurrenceMin === occurrence &&
                          row.detectionMin === detectionBands[0],
                      );

                      if (!cell) {
                        return <td className="px-3 py-2" key={`${severity}-${occurrence}`} />;
                      }

                      return (
                        <td className="px-3 py-2" key={`${severity}-${occurrence}`}>
                          <NativeSelect
                            disabled={!editable || isPending}
                            onChange={(event) => {
                              const value = event.target.value as ActionPriority;

                              setPriorityRows((current) =>
                                current.map((row) =>
                                  row.severityMin === severity && row.occurrenceMin === occurrence
                                    ? { ...row, actionPriority: value }
                                    : row,
                                ),
                              );
                            }}
                            value={cell.actionPriority}
                          >
                            <NativeSelectOption value="H">
                              {t("fmea.priority.H")}
                            </NativeSelectOption>

                            <NativeSelectOption value="M">
                              {t("fmea.priority.M")}
                            </NativeSelectOption>

                            <NativeSelectOption value="L">
                              {t("fmea.priority.L")}
                            </NativeSelectOption>
                          </NativeSelect>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-muted-foreground">{t("fmea.settings.description")}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("fmea.settings.riskClass")}</CardTitle>

          <CardDescription>{t("fmea.settings.description")}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-3">
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="px-3 py-2 text-left">S \ O</th>

                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((occurrence) => (
                    <th className="px-3 py-2 text-left" key={occurrence}>
                      {occurrence}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((severity) => (
                  <tr className="border-b" key={severity}>
                    <td className="px-3 py-2 font-medium">{severity}</td>

                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((occurrence) => {
                      const cell = riskRows.find(
                        (row) => row.severity === severity && row.occurrence === occurrence,
                      );

                      return (
                        <td className="px-3 py-2" key={`${severity}-${occurrence}`}>
                          <NativeSelect
                            disabled={!editable || isPending}
                            onChange={(event) => {
                              const value = event.target.value as RiskClass;

                              setRiskRows((current) =>
                                current.map((row) =>
                                  row.severity === severity && row.occurrence === occurrence
                                    ? { ...row, riskClass: value }
                                    : row,
                                ),
                              );
                            }}
                            value={cell?.riskClass ?? "C"}
                          >
                            <NativeSelectOption value="A">{t("fmea.risk.A")}</NativeSelectOption>

                            <NativeSelectOption value="B">{t("fmea.risk.B")}</NativeSelectOption>

                            <NativeSelectOption value="C">{t("fmea.risk.C")}</NativeSelectOption>
                          </NativeSelect>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {editable ? (
        <Button disabled={isPending} onClick={save}>
          {t("common.save")}
        </Button>
      ) : null}
    </div>
  );
}
