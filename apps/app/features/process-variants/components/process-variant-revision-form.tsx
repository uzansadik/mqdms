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
import { Textarea } from "@mqdms/ui/components/textarea";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { createProcessVariantRevisionAction } from "../actions";
import type { ProcessVariantRevisionFormValues } from "../schema";
import { processVariantRevisionFormSchema } from "../schema";

type ProcessVariantRevisionFormProps = {
  /** Revision'ın ait olduğu varyant. */
  variantId: string;

  /** Varyantın Master Process'i; yönlendirme için kullanılır. */
  processId: string;
};

/**
 * Yeni revision oluşturma formu.
 *
 * Revision teknik içeriğin taşıyıcısıdır; değeri varyant içinde unique'tir.
 */
export function ProcessVariantRevisionForm({
  variantId,
  processId,
}: ProcessVariantRevisionFormProps) {
  const router = useRouter();
  const { t } = useI18n();

  const form = useForm<ProcessVariantRevisionFormValues>({
    resolver: zodResolver(processVariantRevisionFormSchema),
    defaultValues: {
      revision: "",
      description: "",
      changeReason: "",
    },
  });

  async function onSubmit(values: ProcessVariantRevisionFormValues) {
    form.clearErrors("root");

    const result = await createProcessVariantRevisionAction(variantId, values);

    if (!result.success) {
      form.setError("root", { message: result.error });
      toast.error(result.error);
      return;
    }

    toast.success(t("processVariants.revisions.actions.created"));

    router.push(`/master-processes/${processId}/variants/${variantId}`);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("processVariants.revisions.form.title")}</CardTitle>

        <CardDescription>{t("processVariants.revisions.form.description")}</CardDescription>
      </CardHeader>

      <CardContent>
        <form noValidate onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup>
            {form.formState.errors.root && <FieldError errors={[form.formState.errors.root]} />}

            <Controller
              control={form.control}
              name="revision"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>
                    {t("processVariants.revisions.form.revision.label")}
                  </FieldLabel>

                  <Input
                    {...field}
                    aria-invalid={fieldState.invalid}
                    id={field.name}
                    placeholder={t("processVariants.revisions.form.revision.placeholder")}
                  />

                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <Controller
              control={form.control}
              name="changeReason"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>
                    {t("processVariants.revisions.form.changeReason.label")}
                  </FieldLabel>

                  <Input
                    {...field}
                    aria-invalid={fieldState.invalid}
                    id={field.name}
                    placeholder={t("processVariants.revisions.form.changeReason.placeholder")}
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
                    {t("processVariants.revisions.form.description.label")}
                  </FieldLabel>

                  <Textarea
                    {...field}
                    aria-invalid={fieldState.invalid}
                    id={field.name}
                    rows={3}
                    value={field.value ?? ""}
                  />

                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <Button disabled={form.formState.isSubmitting} type="submit">
              {form.formState.isSubmitting
                ? t("items.form.submitting")
                : t("processVariants.revisions.form.submit")}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
