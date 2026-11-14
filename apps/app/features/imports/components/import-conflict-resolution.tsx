"use client";

import { type MessageKey, useI18n } from "@mqdms/i18n";
import { Badge } from "@mqdms/ui/components/badge";
import { Button } from "@mqdms/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@mqdms/ui/components/card";
import { Checkbox } from "@mqdms/ui/components/checkbox";
import { Field, FieldLabel } from "@mqdms/ui/components/field";
import { NativeSelect, NativeSelectOption } from "@mqdms/ui/components/native-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@mqdms/ui/components/table";

import type { ImportRowDecision } from "../schema";
import type { ImportRowResult } from "../validator";

type ImportConflictResolutionProps = {
  /** Mevcut kaydın üzerine yazılacak satırlar. */
  conflicts: ImportRowResult[];

  /** Satır numarası → karar. */
  decisions: Record<string, ImportRowDecision>;

  /** Doğrulama hatası olan satırlar. */
  invalidRows: ImportRowResult[];

  /** Hatalı satırlar atlanacak mı? */
  skipInvalidRows: boolean;

  /** Satır kararı değişti. */
  onDecisionChange: (rowNumber: number, decision: ImportRowDecision) => void;

  /** Hatalı satır politikası değişti. */
  onSkipInvalidRowsChange: (value: boolean) => void;
};

/** Kullanıcıya gösterilebilir dosya değerleri. */
const DISPLAY_FIELDS = [
  "code",
  "name",
  "itemType",
  "supplyType",
  "revision",
  "erpReference",
  "customerPartNumber",
  "customerPartName",
  "customerRevision",
  "internalRevision",
  "quantity",
  "lineNumber",
  "unit",
  "childItemRevision",
] as const;

/** Enum değerlerinin çeviri anahtarı. */
const ENUM_FIELDS = {
  itemType: "items.itemType",
  supplyType: "items.supplyType",
} as const;

/**
 * Çakışma çözümü.
 *
 * Kullanıcı, dosyada mevcut bir kaydı hedefleyen her satır için karar verir:
 * mevcut kayıt korunur ya da dosyadaki değerlerle güncellenir. Hatalı
 * satırlar için karar iş seviyesindedir: atlanırlar ya da import durdurulur.
 */
export function ImportConflictResolution({
  conflicts,
  decisions,
  invalidRows,
  skipInvalidRows,
  onDecisionChange,
  onSkipInvalidRowsChange,
}: ImportConflictResolutionProps) {
  const { t } = useI18n();

  function setAll(decision: ImportRowDecision) {
    for (const conflict of conflicts) {
      onDecisionChange(conflict.rowNumber, decision);
    }
  }

  function describe(row: ImportRowResult): { key: string; value: string }[] {
    const entries: { key: string; value: string }[] = [];

    for (const key of DISPLAY_FIELDS) {
      const raw = row.values[key];

      if (raw === null || raw === undefined || raw === "") {
        continue;
      }

      const enumPrefix = ENUM_FIELDS[key as keyof typeof ENUM_FIELDS];

      const value =
        typeof raw === "string" && enumPrefix
          ? t(`${enumPrefix}.${raw}` as MessageKey)
          : String(raw);

      entries.push({ key, value });
    }

    return entries;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("imports.conflicts.title")}</CardTitle>

        <CardDescription>{t("imports.conflicts.description")}</CardDescription>
      </CardHeader>

      <CardContent>
        <div className="space-y-6">
          {invalidRows.length > 0 && (
            <div className="space-y-3">
              <Field orientation="horizontal">
                <Checkbox
                  checked={skipInvalidRows}
                  id="import-skip-invalid"
                  onCheckedChange={(checked) => onSkipInvalidRowsChange(checked === true)}
                />

                <FieldLabel htmlFor="import-skip-invalid">
                  {t("imports.conflicts.skipInvalid")}
                </FieldLabel>
              </Field>

              <ul className="space-y-1 text-sm text-destructive">
                {invalidRows.map((row) => (
                  <li key={row.rowNumber}>
                    {t("imports.conflicts.invalidRow", { row: row.rowNumber, label: row.label })}:{" "}
                    {row.errors.map((error) => error.message).join(" · ")}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {conflicts.length > 0 && (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => setAll("APPLY")} size="sm" type="button" variant="outline">
                  {t("imports.conflicts.applyAll")}
                </Button>

                <Button onClick={() => setAll("SKIP")} size="sm" type="button" variant="outline">
                  {t("imports.conflicts.skipAll")}
                </Button>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("imports.preview.columns.row")}</TableHead>

                    <TableHead>{t("imports.preview.columns.record")}</TableHead>

                    <TableHead>{t("imports.conflicts.columns.values")}</TableHead>

                    <TableHead>{t("imports.conflicts.columns.decision")}</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {conflicts.map((row) => {
                    const entries = describe(row);

                    return (
                      <TableRow key={row.rowNumber}>
                        <TableCell>{row.rowNumber}</TableCell>

                        <TableCell className="font-medium">{row.label}</TableCell>

                        <TableCell className="text-sm">
                          {entries.length === 0 ? (
                            "-"
                          ) : (
                            <ul>
                              {entries.map((entry) => (
                                <li key={entry.key}>
                                  <span className="text-muted-foreground">
                                    {t(`imports.fields.${entry.key}` as MessageKey)}:{" "}
                                  </span>
                                  {entry.value}
                                </li>
                              ))}
                            </ul>
                          )}
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center gap-2">
                            <NativeSelect
                              aria-label={t("imports.conflicts.columns.decision")}
                              onChange={(event) =>
                                onDecisionChange(
                                  row.rowNumber,
                                  event.target.value as ImportRowDecision,
                                )
                              }
                              value={decisions[String(row.rowNumber)] ?? ""}
                            >
                              <NativeSelectOption value="">
                                {t("imports.conflicts.undecided")}
                              </NativeSelectOption>

                              <NativeSelectOption value="APPLY">
                                {t("imports.conflicts.decision.APPLY")}
                              </NativeSelectOption>

                              <NativeSelectOption value="SKIP">
                                {t("imports.conflicts.decision.SKIP")}
                              </NativeSelectOption>
                            </NativeSelect>

                            {decisions[String(row.rowNumber)] && (
                              <Badge variant="outline">
                                {t(
                                  `imports.conflicts.decision.${decisions[String(row.rowNumber)]}` as MessageKey,
                                )}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
