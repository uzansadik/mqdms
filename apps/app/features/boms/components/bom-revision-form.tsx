"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useI18n } from "@mqdms/i18n";
import { Button } from "@mqdms/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@mqdms/ui/components/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@mqdms/ui/components/field";
import { Input } from "@mqdms/ui/components/input";
import { NativeSelect, NativeSelectOption } from "@mqdms/ui/components/native-select";
import { Textarea } from "@mqdms/ui/components/textarea";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { createBomRevisionAction } from "../actions";
import type { BomRevisionFormValues } from "../schema";
import { bomRevisionFormSchema } from "../schema";

const REVISION_STATUSES = ["DRAFT", "IN_REVIEW", "RELEASED", "SUPERSEDED"] as const;

type BomRevisionFormProps = {
  /** Revision'ın oluşturulacağı BOM; sunucudan gelir. */
  bomId: string;

  /** BOM'un sahibi ürünün revision'ları (opsiyonel eşleştirme). */
  parentItemRevisions: { id: string; revision: string; status: string }[];
};

/**
 * BOM revision formu.
 *
 * Yayınlanmış bir revision'ın içeriği doğrudan değiştirilemez; yeni bir
 * teknik değişiklik için yeni revision oluşturulur.
 */
export function BomRevisionForm({ bomId, parentItemRevisions }: BomRevisionFormProps) {
  const router = useRouter();
  const { t } = useI18n();

  const form = useForm<BomRevisionFormValues>({
    resolver: zodResolver(bomRevisionFormSchema),
    defaultValues: {
      bomId,
      revision: "",
      parentItemRevisionId: "",
      description: "",
      changeReason: "",
      status: "DRAFT",
      effectiveFrom: "",
      sourceSystem: "",
      sourceRevision: "",
    },
  });

  async function onSubmit(values: BomRevisionFormValues) {
    form.clearErrors("root");

    const result = await createBomRevisionAction(values);

    if (!result.success) {
      form.setError("root", { message: result.error });
      return;
    }

    toast.success(t("boms.revisions.actions.created"));

    form.reset({
      bomId,
      revision: "",
      parentItemRevisionId: "",
      description: "",
      changeReason: "",
      status: "DRAFT",
      effectiveFrom: "",
      sourceSystem: "",
      sourceRevision: "",
    });

    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("boms.revisions.form.title")}</CardTitle>

        <CardDescription>{t("boms.revisions.form.description")}</CardDescription>
      </CardHeader>

      <CardContent>
        <form noValidate onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup>
            {form.formState.errors.root && <FieldError errors={[form.formState.errors.root]} />}

            <div className="grid gap-5 sm:grid-cols-3">
              <Controller
                control={form.control}
                name="revision"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>
                      {t("boms.revisions.form.revision.label")}
                    </FieldLabel>

                    <Input
                      {...field}
                      aria-invalid={fieldState.invalid}
                      id={field.name}
                      placeholder={t("boms.revisions.form.revision.placeholder")}
                    />

                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <Controller
                control={form.control}
                name="parentItemRevisionId"
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor={field.name}>
                      {t("boms.revisions.form.parentItemRevision.label")}
                    </FieldLabel>

                    <NativeSelect {...field} id={field.name}>
                      <NativeSelectOption value="">
                        {t("boms.revisions.form.parentItemRevision.none")}
                      </NativeSelectOption>

                      {parentItemRevisions.map((revision) => (
                        <NativeSelectOption key={revision.id} value={revision.id}>
                          {revision.revision}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </Field>
                )}
              />

              <Controller
                control={form.control}
                name="status"
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor={field.name}>
                      {t("boms.revisions.form.status.label")}
                    </FieldLabel>

                    <NativeSelect {...field} id={field.name}>
                      {REVISION_STATUSES.map((status) => (
                        <NativeSelectOption key={status} value={status}>
                          {t(`boms.revisions.status.${status}`)}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </Field>
                )}
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-3">
              <Controller
                control={form.control}
                name="effectiveFrom"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>
                      {t("boms.revisions.form.effectiveFrom.label")}
                    </FieldLabel>

                    <Input
                      {...field}
                      aria-invalid={fieldState.invalid}
                      id={field.name}
                      type="date"
                      value={field.value ?? ""}
                    />

                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <Controller
                control={form.control}
                name="sourceSystem"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>
                      {t("boms.revisions.form.sourceSystem.label")}
                    </FieldLabel>

                    <Input
                      {...field}
                      aria-invalid={fieldState.invalid}
                      id={field.name}
                      placeholder={t("boms.revisions.form.sourceSystem.placeholder")}
                      value={field.value ?? ""}
                    />

                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <Controller
                control={form.control}
                name="sourceRevision"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>
                      {t("boms.revisions.form.sourceRevision.label")}
                    </FieldLabel>

                    <Input
                      {...field}
                      aria-invalid={fieldState.invalid}
                      id={field.name}
                      value={field.value ?? ""}
                    />

                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            </div>

            <Controller
              control={form.control}
              name="changeReason"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>
                    {t("boms.revisions.form.changeReason.label")}
                  </FieldLabel>

                  <Textarea
                    {...field}
                    aria-invalid={fieldState.invalid}
                    id={field.name}
                    rows={2}
                    value={field.value ?? ""}
                  />

                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <Controller
              control={form.control}
              name="description"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>
                    {t("boms.revisions.form.description.label")}
                  </FieldLabel>

                  <Textarea
                    {...field}
                    aria-invalid={fieldState.invalid}
                    id={field.name}
                    rows={2}
                    value={field.value ?? ""}
                  />

                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <Button disabled={form.formState.isSubmitting} type="submit">
              {form.formState.isSubmitting
                ? t("items.form.submitting")
                : t("boms.revisions.form.submit")}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
