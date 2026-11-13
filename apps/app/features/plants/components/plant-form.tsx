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

import { createPlantAction, updatePlantAction } from "../actions";
import type { PlantFormValues } from "../schema";
import { plantFormSchema } from "../schema";

type PlantFormProps = {
  /** Düzenleme modunda tesis kaydı. */
  plant?: {
    id: string;
    code: string;
    name: string;
    description: string | null;
    countryCode: string | null;
    city: string | null;
    address: string | null;
    postalCode: string | null;
    timezone: string | null;
    status: "ACTIVE" | "INACTIVE";
  };
};

/**
 * Tesis formu.
 *
 * Oluşturma ve güncelleme aynı formu paylaşır; tek fark sunucudaki aksiyondur.
 */
export function PlantForm({ plant }: PlantFormProps) {
  const router = useRouter();
  const { t } = useI18n();

  const isEdit = Boolean(plant);

  const form = useForm<PlantFormValues>({
    resolver: zodResolver(plantFormSchema),
    defaultValues: {
      code: plant?.code ?? "",
      name: plant?.name ?? "",
      description: plant?.description ?? "",
      countryCode: plant?.countryCode ?? "",
      city: plant?.city ?? "",
      address: plant?.address ?? "",
      postalCode: plant?.postalCode ?? "",
      timezone: plant?.timezone ?? "",
      status: plant?.status ?? "ACTIVE",
    },
  });

  async function onSubmit(values: PlantFormValues) {
    form.clearErrors("root");

    const result = plant
      ? await updatePlantAction(plant.id, values)
      : await createPlantAction(values);

    if (!result.success) {
      form.setError("root", { message: result.error });
      return;
    }

    form.reset();

    if (plant) {
      router.refresh();
      return;
    }

    router.push("/plants");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {isEdit ? t("plants.form.edit.title") : t("plants.form.create.title")}
        </CardTitle>

        <CardDescription>{t("plants.form.description")}</CardDescription>
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
                    <FieldLabel htmlFor={field.name}>{t("plants.form.code.label")}</FieldLabel>

                    <Input
                      {...field}
                      aria-invalid={fieldState.invalid}
                      id={field.name}
                      placeholder={t("plants.form.code.placeholder")}
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
                    <FieldLabel htmlFor={field.name}>{t("plants.form.name.label")}</FieldLabel>

                    <Input
                      {...field}
                      aria-invalid={fieldState.invalid}
                      id={field.name}
                      placeholder={t("plants.form.name.placeholder")}
                    />

                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-3">
              <Controller
                control={form.control}
                name="countryCode"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>
                      {t("plants.form.countryCode.label")}
                    </FieldLabel>

                    <Input
                      {...field}
                      aria-invalid={fieldState.invalid}
                      id={field.name}
                      maxLength={2}
                      value={field.value ?? ""}
                    />

                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <Controller
                control={form.control}
                name="city"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>{t("plants.form.city.label")}</FieldLabel>

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

              <Controller
                control={form.control}
                name="postalCode"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>
                      {t("plants.form.postalCode.label")}
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

            <div className="grid gap-5 sm:grid-cols-2">
              <Controller
                control={form.control}
                name="timezone"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>{t("plants.form.timezone.label")}</FieldLabel>

                    <Input
                      {...field}
                      aria-invalid={fieldState.invalid}
                      id={field.name}
                      placeholder={t("plants.form.timezone.placeholder")}
                      value={field.value ?? ""}
                    />

                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <Controller
                control={form.control}
                name="status"
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor={field.name}>{t("plants.form.status.label")}</FieldLabel>

                    <NativeSelect {...field} id={field.name}>
                      <NativeSelectOption value="ACTIVE">
                        {t("plants.status.ACTIVE")}
                      </NativeSelectOption>

                      <NativeSelectOption value="INACTIVE">
                        {t("plants.status.INACTIVE")}
                      </NativeSelectOption>
                    </NativeSelect>
                  </Field>
                )}
              />
            </div>

            <Controller
              control={form.control}
              name="address"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>{t("plants.form.address.label")}</FieldLabel>

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

            <Controller
              control={form.control}
              name="description"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>{t("plants.form.description.label")}</FieldLabel>

                  <Textarea
                    {...field}
                    aria-invalid={fieldState.invalid}
                    id={field.name}
                    rows={4}
                    value={field.value ?? ""}
                  />

                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <Button disabled={form.formState.isSubmitting} type="submit">
              {form.formState.isSubmitting
                ? t("plants.form.submitting")
                : isEdit
                  ? t("plants.form.submit.update")
                  : t("plants.form.submit.create")}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
