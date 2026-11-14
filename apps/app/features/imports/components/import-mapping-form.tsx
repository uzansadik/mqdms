"use client";

import { useI18n } from "@mqdms/i18n";
import type { ConflictResolution, ImportField, ImportRowDecision } from "@mqdms/imports/schema";
import { suggestMapping } from "@mqdms/imports/mapping";
import type { ImportPreview } from "@mqdms/imports/types";
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
import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  executeImportJobAction,
  resolveImportJobAction,
  validateImportJobAction,
} from "../actions";
import { ImportConflictResolution } from "./import-conflict-resolution";

type ImportMappingFormProps = {
  /** Import işi. */
  importJobId: string;

  /** Hedef alanlar. */
  fields: readonly ImportField[];

  /** Dosyadaki kolon başlıkları. */
  headers: string[];

  /** Dosyanın ilk satırları; eşleştirme sırasında içerik görünür. */
  sampleRows: Record<string, string>[];

  /** Zorunlu hedef alanlar. */
  requiredFields: readonly string[];

  /** Kaydedilmiş eşleştirme. */
  initialMapping: Record<string, string>;

  /** Kayıtlı çakışma çözümü. */
  initialResolution: ConflictResolution;

  /** Doğrulama önizlemesi; eşleştirme yapılmışsa hazırdır. */
  initialPreview: ImportPreview | null;

  /** İşin durumu; kuyruktaki import'un ilerlemesini izlemek için kullanılır. */
  jobStatus: string;
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
  sampleRows,
  requiredFields,
  initialMapping,
  initialResolution,
  initialPreview,
  jobStatus,
}: ImportMappingFormProps) {
  const router = useRouter();
  const { t } = useI18n();
  const [isPending, startTransition] = useTransition();

  /*
   * Eşleştirme boşsa başlıklar otomatik eşlenir: kullanıcı elle eşleştirmeden
   * önce doğru eşleşmeleri görür.
   */
  const [mapping, setMapping] = useState<Record<string, string>>(
    Object.keys(initialMapping).length > 0 ? initialMapping : suggestMapping(fields, headers),
  );
  const [preview, setPreview] = useState<ImportPreview | null>(initialPreview);
  const [decisions, setDecisions] = useState<Record<string, ImportRowDecision>>(
    initialResolution.rows,
  );
  const [skipInvalidRows, setSkipInvalidRows] = useState(initialResolution.skipInvalidRows);

  /* Önizlemede yalnızca hatalı satırlar gösterilebilir. */
  const [onlyErrors, setOnlyErrors] = useState(false);

  /* Önizleme sayfalama: 50.000 satırın tamamı render edilemez. */
  const [page, setPage] = useState(0);

  const PAGE_SIZE = 50;

  /* İş kuyruğa alındı mı? Worker'da çalışan import'un durumu izlenir. */
  const [isQueued, setIsQueued] = useState(false);

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

  /*
   * Önizleme satırları 50.000'e kadar olabilir; hepsini render etmek tarayıcıyı
   * kilitler. Filtre ve sayfalama birlikte kullanılır.
   */
  const filteredRows = useMemo(
    () =>
      preview === null
        ? []
        : onlyErrors
          ? preview.rows.filter((row) => row.status === "ERROR")
          : preview.rows,
    [onlyErrors, preview],
  );

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);

  const visibleRows = useMemo(
    () => filteredRows.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE),
    [currentPage, filteredRows],
  );

  const undecidedCount = preview
    ? preview.conflicts.filter((row) => !decisions[String(row.rowNumber)]).length
    : 0;

  function validate() {
    startTransition(async () => {
      const result = await validateImportJobAction({
        importJobId,
        columnMapping: Object.fromEntries(
          Object.entries(mapping).filter(([, value]) => value !== ""),
        ),
      });

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

      /*
       * Yazma adımı worker'da çalışır; iş kuyruğa alındı. Sayfa periyodik
       * olarak yenilenir ve import'un durumu izlenir.
       */
      setIsQueued(true);

      toast.success(t("imports.mapping.queued"));

      router.refresh();
    });
  }

  /*
   * Kuyruktaki import'un durumu izlenir. İş tamamlandığında ya da
   * başarısız olduğunda yoklama durur.
   */
  useEffect(() => {
    if (jobStatus === "COMPLETED" || jobStatus === "FAILED") {
      setIsQueued(false);
    }
  }, [jobStatus]);

  useEffect(() => {
    if (!isQueued) {
      return;
    }

    const timer = setInterval(() => {
      router.refresh();
    }, 2000);

    return () => {
      clearInterval(timer);
    };
  }, [isQueued, router]);

  return (
    <div className="space-y-4">
      {sampleRows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("imports.mapping.sample.title")}</CardTitle>

            <CardDescription>{t("imports.mapping.sample.description")}</CardDescription>
          </CardHeader>

          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("imports.mapping.sample.row")}</TableHead>

                    {headers.map((header) => (
                      <TableHead key={header}>{header}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {sampleRows.map((row, index) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: örnek satırın sırası kimliğidir
                    <TableRow key={`sample-${index}`}>
                      <TableCell className="text-muted-foreground">{index + 1}</TableCell>

                      {headers.map((header) => (
                        <TableCell key={header} className="max-w-56 truncate text-sm">
                          {row[header] || "-"}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

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
                  <FieldLabel htmlFor={`field-${field}`}>
                    {t(`imports.fields.${field}`)}

                    {requiredFields.includes(field) && (
                      <span className="text-destructive" title={t("imports.mapping.required")}>
                        *
                      </span>
                    )}
                  </FieldLabel>

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
                disabled={
                  isPending ||
                  !preview ||
                  (needsResolution && !isResolved) ||
                  isQueued ||
                  jobStatus === "RUNNING" ||
                  jobStatus === "COMPLETED"
                }
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

            {/*
             * Hatalı satırlar filtresi: binlerce satır arasından hatalı
             * olana ulaşmak mümkün olmalı.
             */}
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <Button
                onClick={() => {
                  setOnlyErrors((current) => !current);
                  setPage(0);
                }}
                size="sm"
                type="button"
                variant={onlyErrors ? "default" : "outline"}
              >
                {onlyErrors
                  ? t("imports.preview.filter.errorsActive")
                  : t("imports.preview.filter.errors")}
              </Button>

              <span className="text-sm text-muted-foreground">
                {t("imports.preview.count", {
                  shown: visibleRows.length,
                  total: filteredRows.length,
                })}
              </span>
            </div>

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
                {visibleRows.map((row) => (
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

            {pageCount > 1 && (
              <div className="mt-4 flex items-center justify-between gap-3">
                <Button
                  disabled={currentPage === 0}
                  onClick={() => setPage(currentPage - 1)}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  {t("imports.preview.previous")}
                </Button>

                <span className="text-sm text-muted-foreground">
                  {t("imports.preview.page", {
                    current: currentPage + 1,
                    total: pageCount,
                  })}
                </span>

                <Button
                  disabled={currentPage >= pageCount - 1}
                  onClick={() => setPage(currentPage + 1)}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  {t("imports.preview.next")}
                </Button>
              </div>
            )}
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
