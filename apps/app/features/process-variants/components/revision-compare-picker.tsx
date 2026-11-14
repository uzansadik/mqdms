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
import { Field, FieldLabel } from "@mqdms/ui/components/field";
import { NativeSelect, NativeSelectOption } from "@mqdms/ui/components/native-select";
import { useRouter } from "next/navigation";
import { useState } from "react";

type RevisionComparePickerProps = {
  /** Varyantın revision listesi. */
  revisions: {
    id: string;
    revision: string;
    status: "DRAFT" | "IN_REVIEW" | "APPROVED" | "RELEASED" | "SUPERSEDED";
  }[];

  /** Karşılaştırma rotasının kökü. */
  basePath: string;
};

/**
 * Karşılaştırılacak iki revision'ın seçildiği ekran.
 *
 * Seçim sonrası karşılaştırma sayfası `from` ve `to` sorgu parametreleriyle
 * açılır.
 */
export function RevisionComparePicker({ revisions, basePath }: RevisionComparePickerProps) {
  const router = useRouter();
  const { t } = useI18n();

  const [from, setFrom] = useState(revisions[0]?.id ?? "");
  const [to, setTo] = useState(revisions[1]?.id ?? revisions[0]?.id ?? "");

  function submit() {
    if (!from || !to) {
      return;
    }

    router.push(`${basePath}/revisions/compare?from=${from}&to=${to}`);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("processVariants.compare.select.title")}</CardTitle>

        <CardDescription>{t("processVariants.compare.select.description")}</CardDescription>
      </CardHeader>

      <CardContent>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="compare-from">{t("processVariants.compare.from")}</FieldLabel>

            <NativeSelect
              id="compare-from"
              onChange={(event) => setFrom(event.target.value)}
              value={from}
            >
              {revisions.map((revision) => (
                <NativeSelectOption key={revision.id} value={revision.id}>
                  {revision.revision} · {t(`processVariants.revisions.status.${revision.status}`)}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>

          <Field>
            <FieldLabel htmlFor="compare-to">{t("processVariants.compare.to")}</FieldLabel>

            <NativeSelect
              id="compare-to"
              onChange={(event) => setTo(event.target.value)}
              value={to}
            >
              {revisions.map((revision) => (
                <NativeSelectOption key={revision.id} value={revision.id}>
                  {revision.revision} · {t(`processVariants.revisions.status.${revision.status}`)}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
        </div>

        <Button
          className="mt-5"
          disabled={revisions.length < 2 || !from || !to}
          onClick={submit}
          type="button"
        >
          {t("processVariants.compare.select.submit")}
        </Button>
      </CardContent>
    </Card>
  );
}
