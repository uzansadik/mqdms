"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useI18n } from "@mqdms/i18n";
import { Field, FieldError, FieldGroup, FieldLabel } from "@mqdms/ui/components/field";
import { Input } from "@mqdms/ui/components/input";
import { NativeSelect, NativeSelectOption } from "@mqdms/ui/components/native-select";
import { Textarea } from "@mqdms/ui/components/textarea";
import { Controller, useForm } from "react-hook-form";

import { createFmeaDocumentAction, updateFmeaDocumentAction } from "../actions";
import { type FmeaDocumentFormValues, fmeaDocumentFormSchema } from "../schema";

type FmeaDocumentFormProps = {
  /** Ait olduğu Process Variant Revision. */
  revisionId: string;

  /** Düzenleme modunda belge. */
  document?: {
    id: string;
    code: string;
    name: string;
    description: string | null;
    fmeaType: "PFMEA" | "DFMEA" | "SFMEA";
    evaluationMethod: "ACTION_PRIORITY" | "RAG" | "BOTH";
    scopeDescription: string | null;
    responsibility: string | null;
    targetDate: string | null;
  };

  /** Oluşturma sonrası çağrılır. */
  onCreated?: () => void;
};

/**
 * FMEA belgesi formu.
 *
 * Oluşturma ve güncelleme aynı formu paylaşır; tek fark sunucudaki aksiyondur.
 */
export function FmeaDocumentForm({ revisionId, document, onCreated }: FmeaDocumentFormProps) {
  const { t } = useI18n();

  const form = useForm<FmeaDocumentFormValues>({
    resolver: zodResolver(fmeaDocumentFormSchema),
    defaultValues: {
      code: document?.code ?? "",
      name: document?.name ?? "",
      description: document?.description ?? "",
      fmeaType: document?.fmeaType ?? "PFMEA",
      evaluationMethod: document?.evaluationMethod ?? "BOTH",
      scopeDescription: document?.scopeDescription ?? "",
      responsibility: document?.responsibility ?? "",
      targetDate: document?.targetDate ?? "",
    },
  });

  async function onSubmit(values: FmeaDocumentFormValues) {
    form.clearErrors("root");

    const result = document
      ? await updateFmeaDocumentAction(document.id, values)
      : await createFmeaDocumentAction(revisionId, values);

    if (!result.success) {
      form.setError("root", { message: result.error });

      return;
    }

    form.reset(values);

    onCreated?.();
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();

        void onSubmit(form.getValues());
      }}
    >
      <FieldGroup>
        <Controller
          control={form.control}
          name="code"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>{t("fmea.form.code.label")}</FieldLabel>

              <Input
                {...field}
                aria-invalid={fieldState.invalid}
                id={field.name}
                placeholder={t("fmea.form.code.placeholder")}
              />

              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          control={form.control}
          name="name"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>{t("fmea.form.name.label")}</FieldLabel>

              <Input
                {...field}
                aria-invalid={fieldState.invalid}
                id={field.name}
                placeholder={t("fmea.form.name.placeholder")}
              />

              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Controller
            control={form.control}
            name="fmeaType"
            render={({ field }) => (
              <Field>
                <FieldLabel htmlFor={field.name}>{t("fmea.form.type.label")}</FieldLabel>

                <NativeSelect {...field} id={field.name}>
                  <NativeSelectOption value="PFMEA">{t("fmea.type.PFMEA")}</NativeSelectOption>
                  <NativeSelectOption value="DFMEA">{t("fmea.type.DFMEA")}</NativeSelectOption>
                  <NativeSelectOption value="SFMEA">{t("fmea.type.SFMEA")}</NativeSelectOption>
                </NativeSelect>
              </Field>
            )}
          />

          <Controller
            control={form.control}
            name="evaluationMethod"
            render={({ field }) => (
              <Field>
                <FieldLabel htmlFor={field.name}>{t("fmea.form.method.label")}</FieldLabel>

                <NativeSelect {...field} id={field.name}>
                  <NativeSelectOption value="BOTH">{t("fmea.method.BOTH")}</NativeSelectOption>

                  <NativeSelectOption value="ACTION_PRIORITY">
                    {t("fmea.method.ACTION_PRIORITY")}
                  </NativeSelectOption>

                  <NativeSelectOption value="RAG">{t("fmea.method.RAG")}</NativeSelectOption>
                </NativeSelect>
              </Field>
            )}
          />
        </div>

        <Controller
          control={form.control}
          name="scopeDescription"
          render={({ field }) => (
            <Field>
              <FieldLabel htmlFor={field.name}>{t("fmea.form.scope.label")}</FieldLabel>

              <Textarea {...field} id={field.name} rows={3} />
            </Field>
          )}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Controller
            control={form.control}
            name="responsibility"
            render={({ field }) => (
              <Field>
                <FieldLabel htmlFor={field.name}>{t("fmea.form.responsibility.label")}</FieldLabel>

                <Input {...field} id={field.name} />
              </Field>
            )}
          />

          <Controller
            control={form.control}
            name="targetDate"
            render={({ field }) => (
              <Field>
                <FieldLabel htmlFor={field.name}>{t("fmea.form.targetDate.label")}</FieldLabel>

                <Input {...field} id={field.name} type="date" />
              </Field>
            )}
          />
        </div>

        <Controller
          control={form.control}
          name="description"
          render={({ field }) => (
            <Field>
              <FieldLabel htmlFor={field.name}>{t("fmea.form.description.label")}</FieldLabel>

              <Textarea {...field} id={field.name} rows={2} />
            </Field>
          )}
        />

        {form.formState.errors.root?.message ? (
          <p className="text-sm text-destructive">{form.formState.errors.root.message}</p>
        ) : null}
      </FieldGroup>
    </form>
  );
}
