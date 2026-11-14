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

import { executeImportJobAction, validateImportJobAction } from "../actions";
import type { ImportField, ImportType } from "../schema";
import type { ImportPreview } from "../service";

type ImportMappingFormProps = {
  /** Import işi. */
  importJobId: string;

  /** Import türü. */
  importType: ImportType;

  /** Hedef alanlar. */
  fields: readonly ImportField[];

  /** Dosyadaki kolon başlıkları. */
  headers: string[];

  /** Kaydedilmiş eşleştirme. */
  initialMapping: Record<string, string>;
};

/**
 * Kolon eşleştirme ve önizleme.
 *
 * Doğrulama veri yazmaz; yalnızca ne yapılacağını gösterir. Yazma işlemi
 * kullanıcı onayından sonra ve **tek transaction** içinde gerçekleşir.
 */
export function ImportMappingForm({
  importJobId,
  importType,
  fields,
  headers,
  initialMapping,
}: ImportMappingFormProps) {
  const router = useRouter();
  const { t } = useI18n();
  const [isPending, startTransition] = useTransition();

  const [mapping, setMapping] = useState<Record<string, string>>(initialMapping);
  const [preview, setPreview] = useState<ImportPreview | null>(null);

  function validate() {
    startTransition(async () => {
      const result = await validateImportJobAction({ importJobId, columnMapping: mapping });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      setPreview(result.preview);

      if (result.preview.errorCount > 0) {
        toast.error(t("imports.mapping.hasErrors"));
        return;
      }

      toast.success(t("imports.mapping.validated"));
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

              <Button
                disabled={isPending || !preview || preview.errorCount > 0}
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
    </div>
  );
}
