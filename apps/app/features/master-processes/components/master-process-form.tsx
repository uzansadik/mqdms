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

import { createProcessAction, updateProcessAction } from "../actions";
import type { ProcessFormValues } from "../schema";
import { processFormSchema } from "../schema";

const CATEGORIES = [
  "MANUFACTURING",
  "INSPECTION",
  "ASSEMBLY",
  "STORAGE",
  "TRANSPORT",
  "OUTSOURCED",
  "PACKAGING",
  "OTHER",
] as const;

type MasterProcessFormProps = {
  /** Düzenleme modunda proses kaydı. */
  process?: {
    id: string;
    code: string;
    name: string;
    description: string | null;
    category: ProcessFormValues["category"];
    status: "ACTIVE" | "INACTIVE";
  };
};

/**
 * Master Process formu.
 *
 * Master Process organizasyonun ortak proses tanımıdır; bir projeye ait
 * olmaz ve üzerinde operasyon numarası girilmez.
 */
export function MasterProcessForm({ process }: MasterProcessFormProps) {
  const router = useRouter();
  const { t } = useI18n();

  const form = useForm<ProcessFormValues>({
    resolver: zodResolver(processFormSchema),
    defaultValues: {
      code: process?.code ?? "",
      name: process?.name ?? "",
      description: process?.description ?? "",
      category: process?.category ?? "MANUFACTURING",
      status: process?.status ?? "ACTIVE",
    },
  });

  async function onSubmit(values: ProcessFormValues) {
    form.clearErrors("root");

    const result = process
      ? await updateProcessAction(process.id, values)
      : await createProcessAction(values);

    if (!result.success) {
      form.setError("root", { message: result.error });
      toast.error(result.error);
      return;
    }

    toast.success(t(process ? "processes.actions.updated" : "processes.actions.created"));

    router.push("/master-processes");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t(process ? "processes.form.editTitle" : "processes.form.title")}</CardTitle>

        <CardDescription>{t("processes.form.description")}</CardDescription>
      </CardHeader>

      <CardContent>
        <form noValidate onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup>
            {form.formState.errors.root && <FieldError errors={[form.formState.errors.root]} />}

            <div className="grid gap-5 sm:grid-cols-2">
              <Controller
                control={form.control}
                name="code"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>{t("processes.form.code.label")}</FieldLabel>

                    <Input
                      {...field}
                      aria-invalid={fieldState.invalid}
                      id={field.name}
                      placeholder={t("processes.form.code.placeholder")}
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
                    <FieldLabel htmlFor={field.name}>{t("processes.form.name.label")}</FieldLabel>

                    <Input
                      {...field}
                      aria-invalid={fieldState.invalid}
                      id={field.name}
                      placeholder={t("processes.form.name.placeholder")}
                    />

                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <Controller
                control={form.control}
                name="category"
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor={field.name}>
                      {t("processes.form.category.label")}
                    </FieldLabel>

                    <NativeSelect {...field} id={field.name}>
                      {CATEGORIES.map((category) => (
                        <NativeSelectOption key={category} value={category}>
                          {t(`processes.categories.${category}`)}
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
                    <FieldLabel htmlFor={field.name}>{t("processes.form.status.label")}</FieldLabel>

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
                    {t("processes.form.description.label")}
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
                : t("processes.form.submit")}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
