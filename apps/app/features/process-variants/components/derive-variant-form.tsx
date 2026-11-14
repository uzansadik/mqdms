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
import { Checkbox } from "@mqdms/ui/components/checkbox";
import { Field, FieldLabel } from "@mqdms/ui/components/field";
import { Input } from "@mqdms/ui/components/input";
import { NativeSelect, NativeSelectOption } from "@mqdms/ui/components/native-select";
import { Textarea } from "@mqdms/ui/components/textarea";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { deriveProcessVariantAction } from "../actions";

type DeriveVariantFormProps = {
  /** Türetilecek ana proses. */
  processId: string;

  /** Kaynak olabilecek yayınlanmış jenerik revision'lar. */
  sources: {
    id: string;
    revision: string;
    variantId: string;
    variantCode: string;
    variantName: string;
  }[];
};

type SelectionKey = "flow" | "workElements" | "functions" | "requirements" | "io" | "applicability";

const SELECTION_KEYS: SelectionKey[] = [
  "flow",
  "workElements",
  "functions",
  "requirements",
  "io",
  "applicability",
];

/**
 * Türetme ekranı.
 *
 * Kullanıcı jenerik bir revision'ı seçer, yeni varyantın kimliğini tanımlar
 * ve aktarılacak teknik içerikleri seçer. Kırık referans oluşmaz: bir içerik
 * seçilmezse ona bağlı bağlantılar kopyalanmaz.
 */
export function DeriveVariantForm({ processId, sources }: DeriveVariantFormProps) {
  const router = useRouter();
  const { t } = useI18n();
  const [isPending, startTransition] = useTransition();

  const [sourceRevisionId, setSourceRevisionId] = useState(sources[0]?.id ?? "");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selections, setSelections] = useState<Record<SelectionKey, boolean>>({
    flow: true,
    workElements: true,
    functions: true,
    requirements: true,
    io: true,
    applicability: true,
  });

  function toggle(key: SelectionKey) {
    setSelections((current) => ({ ...current, [key]: !current[key] }));
  }

  function submit() {
    if (!sourceRevisionId) {
      toast.error(t("processVariants.derive.errors.noSource"));
      return;
    }

    startTransition(async () => {
      const result = await deriveProcessVariantAction({
        sourceVariantRevisionId: sourceRevisionId,
        code,
        name,
        description,
        selections,
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success(t("processVariants.derive.actions.derived"));

      router.push(`/master-processes/${processId}`);
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("processVariants.derive.form.title")}</CardTitle>

        <CardDescription>{t("processVariants.derive.form.description")}</CardDescription>
      </CardHeader>

      <CardContent>
        <div className="space-y-5">
          <Field>
            <FieldLabel htmlFor="derive-source">
              {t("processVariants.derive.form.source")}
            </FieldLabel>

            <NativeSelect
              id="derive-source"
              onChange={(event) => setSourceRevisionId(event.target.value)}
              value={sourceRevisionId}
            >
              {sources.length === 0 && (
                <NativeSelectOption value="">
                  {t("processVariants.derive.form.noSource")}
                </NativeSelectOption>
              )}

              {sources.map((source) => (
                <NativeSelectOption key={source.id} value={source.id}>
                  {source.variantCode} · {source.revision}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="derive-code">{t("processVariants.form.code.label")}</FieldLabel>

              <Input
                id="derive-code"
                onChange={(event) => setCode(event.target.value)}
                placeholder={t("processVariants.form.code.placeholder")}
                value={code}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="derive-name">{t("processVariants.form.name.label")}</FieldLabel>

              <Input
                id="derive-name"
                onChange={(event) => setName(event.target.value)}
                placeholder={t("processVariants.form.name.placeholder")}
                value={name}
              />
            </Field>
          </div>

          <Field>
            <FieldLabel htmlFor="derive-description">
              {t("processVariants.form.description.label")}
            </FieldLabel>

            <Textarea
              id="derive-description"
              onChange={(event) => setDescription(event.target.value)}
              rows={2}
              value={description}
            />
          </Field>

          <Field>
            <FieldLabel>{t("processVariants.derive.form.selections")}</FieldLabel>

            <div className="flex flex-wrap gap-2">
              {SELECTION_KEYS.map((key) => {
                const checkboxId = `derive-selection-${key}`;

                return (
                  <div
                    className="flex items-center gap-2 rounded-md border px-2 py-1 text-sm"
                    key={key}
                  >
                    <Checkbox
                      checked={selections[key]}
                      id={checkboxId}
                      onCheckedChange={() => toggle(key)}
                    />

                    <label className="cursor-pointer" htmlFor={checkboxId}>
                      {t(`processVariants.derive.selections.${key}`)}
                    </label>
                  </div>
                );
              })}
            </div>
          </Field>

          <Button disabled={isPending || sources.length === 0} onClick={submit} type="button">
            {t("processVariants.derive.form.submit")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
