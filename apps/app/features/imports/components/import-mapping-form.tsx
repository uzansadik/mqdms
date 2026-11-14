"use client";

import { useI18n } from "@mqdms/i18n";
import { Badge } from "@mqdms/ui/components/badge";
import { Button } from "@mqdms/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@mqdms/ui/components/card";
import { Field, FieldGroup, FieldLabel } from "@mqdms/ui/components/field";
import { NativeSelect, NativeSelectOption } from "@mqdms/ui/components/native-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@mqdms/ui/components/table";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  executeImportJobAction,
  resolveImportJobAction,
  validateImportJobAction,
} from "../actions";
import type { ConflictResolution, ImportField, ImportRowDecision } from "../schema";
import type { ImportPreview } from "../service";
import { ImportConflictResolution } from "./import-conflict-resolution";

type ImportMappingFormProps = {
  /** Import işi. */
  importJobId: string;

  /** Hedef alanlar. */
  fields: readonly ImportField[];

  /** Dosyadaki kolon başlıkları. */
  headers: string[];

  /** Kaydedilmiş eşleştirme. */
  initialMapping: Record<string, string>;

  /** Kayıtlı çakışma çözümü. */
  initialResolution: ConflictResolution;

  /** Doğrulama önizlemesi; eşleştirme yapılmışsa hazırdır. */
  initialPreview: ImportPreview | null;
};

/**
 * Kolon eşleştirme, önizleme ve çakışma çözümü.
 *
 * Doğrulama veri yazmaz; yalnızca ne yapılacağını gösterir. Yazma işlemi
 * kullanıcı onayından sonra ve **tek transaction** içinde gerçekleşir.
 *
 * Mevcut kaydı hedefleyen satırlar için kullanıcı karar vermek zorundadır;
 * karar verilmeden import çalıştırılamaz.
 */
export function ImportMappingForm({
  importJobId,
  fields,
  headers,
  initialMapping,
  initialResolution,
  initialPreview,
}: ImportMappingFormProps) {
  const router = useRouter();
  const { t } = useI18n();
  const [isPending, startTransition] = useTransition();

  const [mapping, setMapping] = useState<Record<string, string>>(initialMapping);
  const [preview, setPreview] = useState<ImportPreview | null>(initialPreview);
  const [decisions, setDecisions] = useState<Record<string, ImportRowDecision>>(
    initialResolution.rows,
  );
  const [skipInvalidRows, setSkipInvalidRows] = useState(initialResolution.skipInvalidRows);

  /*
   * Kararlar kaydedildi mi? Çakışma olan bir import için kaydedilmemiş karar
   * varsa import çalıştırılamaz.
   */
  const [isResolved, setIsResolved] = useState(
    initialPreview !== null &&
      initialPreview.conflicts.length === 0 &&
      initialPreview.invalidRows.length === 0,
  );

  const needsResolution =
    preview !== null && (preview.conflicts.length > 0 || preview.invalidRows.length > 0);

  const undecidedCount = preview
    ? preview.conflicts.filter((row) => !decisions[String(row.rowNumber)]).length
    : 0;

  function validate() {
    startTransition(async () => {
      const result = await validateImportJobAction({ importJobId, columnMapping: mapping });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      setPreview(result.preview);
      setDecisions({});
      setSkipInvalidRows(false);
      setIsResolved(
        result.preview.conflicts.length === 0 && result.preview.invalidRows.length === 0,
      );

      if (result.preview.errorCount > 0) {
        toast.error(t("imports.mapping.hasErrors"));
        return;
      }

      toast.success(t("imports.mapping.validated"));
    });
  }

  function changeDecision(rowNumber: number, decision: ImportRowDecision) {
    setDecisions((current) => ({ ...current, [String(rowNumber)]: decision }));
    setIsResolved(false);
  }

  function resolve() {
    startTransition(async () => {
      const result = await resolveImportJobAction({
        importJobId,
        resolution: { rows: decisions, skipInvalidRows },
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      setPreview(result.preview);
      setIsResolved(true);

      toast.success(t("imports.conflicts.resolved"));
    });
  }

  function execute() {
    startTransition(async () => {
      const result = await executeImportJobAction({ importJobId });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success(t("imports.mapping.executed"));

      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{t("imports.mapping.title")}</CardTitle>

          <CardDescription>{t("imports.mapping.description")}</CardDescription>
        </CardHeader>

        <CardContent>
          <FieldGroup>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {fields.map((field) => (
                <Field key={field}>
                  <FieldLabel htmlFor={`field-${field}`}>{t(`imports.fields.${field}`)}</FieldLabel>

                  <NativeSelect
                    id={`field-${field}`}
                    onChange={(event) =>
                      setMapping((current) => ({ ...current, [field]: event.target.value }))
                    }
                    value={mapping[field] ?? ""}
                  >
                    <NativeSelectOption value="">
                      {t("imports.mapping.notMapped")}
                    </NativeSelectOption>

                    {headers.map((header) => (
                      <NativeSelectOption key={header} value={header}>
                        {header}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </Field>
              ))}
            </div>

            <div className="flex gap-2">
              <Button disabled={isPending} onClick={validate} type="button">
                {t("imports.mapping.validate")}
              </Button>

              {needsResolution && (
                <Button
                  disabled={
                    isPending ||
                    undecidedCount > 0 ||
                    (!skipInvalidRows && preview.invalidRows.length > 0)
                  }
                  onClick={resolve}
                  type="button"
                  variant="outline"
                >
                  {t("imports.conflicts.submit")}
                </Button>
              )}

              <Button
                disabled={isPending || !preview || (needsResolution && !isResolved)}
                onClick={execute}
                type="button"
                variant="outline"
              >
                {t("imports.mapping.execute")}
              </Button>
            </div>
          </FieldGroup>
        </CardContent>
      </Card>

      {preview && (
        <Card>
          <CardHeader>
            <CardTitle>{t("imports.preview.title")}</CardTitle>

            <CardDescription>
              {t("imports.preview.summary", {
                total: preview.totalRows,
                create: preview.createCount,
                update: preview.updateCount,
                error: preview.errorCount,
              })}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {preview.errorCount > 0 && (
              <p className="mb-4 text-sm text-destructive">{t("imports.preview.blocked")}</p>
            )}

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("imports.preview.columns.row")}</TableHead>

                  <TableHead>{t("imports.preview.columns.record")}</TableHead>

                  <TableHead>{t("imports.preview.columns.status")}</TableHead>

                  <TableHead>{t("imports.preview.columns.details")}</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {preview.rows.map((row) => (
                  <TableRow key={row.rowNumber}>
                    <TableCell>{row.rowNumber}</TableCell>

                    <TableCell className="font-medium">{row.label}</TableCell>

                    <TableCell>
                      <Badge
                        variant={
                          row.status === "ERROR"
                            ? "destructive"
                            : row.status === "CREATE"
                              ? "default"
                              : "secondary"
                        }
                      >
                        {t(`imports.preview.status.${row.status}`)}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-sm">
                      {row.errors.length === 0
                        ? "-"
                        : row.errors.map((error) => error.message).join(" · ")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {preview && needsResolution && (
        <ImportConflictResolution
          conflicts={preview.conflicts}
          decisions={decisions}
          invalidRows={preview.invalidRows}
          onDecisionChange={changeDecision}
          onSkipInvalidRowsChange={(value) => {
            setSkipInvalidRows(value);
            setIsResolved(false);
          }}
          skipInvalidRows={skipInvalidRows}
        />
      )}
    </div>
  );
}
