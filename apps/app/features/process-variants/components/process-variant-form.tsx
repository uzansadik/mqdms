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

import { createProcessVariantAction, updateProcessVariantAction } from "../actions";
import type { ProcessVariantFormValues } from "../schema";
import { processVariantFormSchema } from "../schema";

type ProcessVariantFormProps = {
  /** Ait olduğu Master Process. */
  processId: string;

  /** Düzenleme modunda varyant kaydı. */
  variant?: {
    id: string;
    code: string;
    name: string;
    description: string | null;
    variantType: ProcessVariantFormValues["variantType"];
    status: "ACTIVE" | "INACTIVE";
  };
};

/**
 * Process Variant formu.
 *
 * Varyant yalnızca kimlik ve sınıf bilgisini taşır; teknik içerik revision
 * üzerinden yönetilir.
 */
export function ProcessVariantForm({ processId, variant }: ProcessVariantFormProps) {
  const router = useRouter();
  const { t } = useI18n();

  const form = useForm<ProcessVariantFormValues>({
    resolver: zodResolver(processVariantFormSchema),
    defaultValues: {
      processId,
      code: variant?.code ?? "",
      name: variant?.name ?? "",
      description: variant?.description ?? "",
      variantType: variant?.variantType ?? "GENERIC",
      status: variant?.status ?? "ACTIVE",
    },
  });

  async function onSubmit(values: ProcessVariantFormValues) {
    form.clearErrors("root");

    const result = variant
      ? await updateProcessVariantAction(variant.id, values)
      : await createProcessVariantAction(values);

    if (!result.success) {
      form.setError("root", { message: result.error });
      toast.error(result.error);
      return;
    }

    toast.success(
      t(variant ? "processVariants.actions.updated" : "processVariants.actions.created"),
    );

    router.push(`/master-processes/${values.processId}`);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {t(variant ? "processVariants.form.editTitle" : "processVariants.form.title")}
        </CardTitle>

        <CardDescription>{t("processVariants.form.description")}</CardDescription>
      </CardHeader>

      <CardContent>
        <form noValidate onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup>
            {form.formState.errors.root && <FieldError errors={[form.formState.errors.root]} />}

            <Controller
              control={form.control}
              name="processId"
              render={({ field }) => <input type="hidden" {...field} />}
            />

            <div className="grid gap-5 sm:grid-cols-2">
              <Controller
                control={form.control}
                name="code"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>
                      {t("processVariants.form.code.label")}
                    </FieldLabel>

                    <Input
                      {...field}
                      aria-invalid={fieldState.invalid}
                      id={field.name}
                      placeholder={t("processVariants.form.code.placeholder")}
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
                    <FieldLabel htmlFor={field.name}>
                      {t("processVariants.form.name.label")}
                    </FieldLabel>

                    <Input
                      {...field}
                      aria-invalid={fieldState.invalid}
                      id={field.name}
                      placeholder={t("processVariants.form.name.placeholder")}
                    />

                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <Controller
                control={form.control}
                name="variantType"
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor={field.name}>
                      {t("processVariants.form.variantType.label")}
                    </FieldLabel>

                    <NativeSelect {...field} id={field.name}>
                      <NativeSelectOption value="GENERIC">
                        {t("processVariants.types.GENERIC")}
                      </NativeSelectOption>

                      <NativeSelectOption value="SPECIALIZED">
                        {t("processVariants.types.SPECIALIZED")}
                      </NativeSelectOption>
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
                      {t("processVariants.form.status.label")}
                    </FieldLabel>

                    <NativeSelect {...field} id={field.name}>
                      <NativeSelectOption value="ACTIVE">
                        {t("items.status.ACTIVE")}
                      </NativeSelectOption>

                      <NativeSelectOption value="INACTIVE">
                        {t("items.status.INACTIVE")}
                      </NativeSelectOption>
                    </NativeSelect>
                  </Field>
                )}
              />
            </div>

            <Controller
              control={form.control}
              name="description"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>
                    {t("processVariants.form.description.label")}
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
                : t("processVariants.form.submit")}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
