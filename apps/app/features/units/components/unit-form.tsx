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
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { createUnitAction } from "../actions";
import type { UnitFormValues } from "../schema";
import { unitFormSchema } from "../schema";

const DIMENSIONS = ["MASS", "LENGTH", "AREA", "VOLUME", "COUNT", "OTHER"] as const;

/**
 * Birim formu.
 *
 * Dönüşüm faktörü boş bırakılan birim, boyutun **taban birimi** olur. Bir
 * boyutta ikinci bir taban birim oluşturulamaz.
 */
export function UnitForm() {
  const router = useRouter();
  const { t } = useI18n();

  const form = useForm<UnitFormValues>({
    resolver: zodResolver(unitFormSchema),
    defaultValues: {
      code: "",
      name: "",
      dimension: "COUNT",
      decimalPlaces: 0,
      conversionFactor: "",
      status: "ACTIVE",
    },
  });

  async function onSubmit(values: UnitFormValues) {
    form.clearErrors("root");

    const result = await createUnitAction(values);

    if (!result.success) {
      form.setError("root", { message: result.error });
      return;
    }

    toast.success(t("units.actions.created"));

    form.reset();

    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("units.form.title")}</CardTitle>

        <CardDescription>{t("units.form.description")}</CardDescription>
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
                    <FieldLabel htmlFor={field.name}>{t("units.form.code.label")}</FieldLabel>

                    <Input
                      {...field}
                      aria-invalid={fieldState.invalid}
                      id={field.name}
                      placeholder={t("units.form.code.placeholder")}
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
                    <FieldLabel htmlFor={field.name}>{t("units.form.name.label")}</FieldLabel>

                    <Input
                      {...field}
                      aria-invalid={fieldState.invalid}
                      id={field.name}
                      placeholder={t("units.form.name.placeholder")}
                    />

                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-3">
              <Controller
                control={form.control}
                name="dimension"
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor={field.name}>{t("units.form.dimension.label")}</FieldLabel>

                    <NativeSelect {...field} id={field.name}>
                      {DIMENSIONS.map((dimension) => (
                        <NativeSelectOption key={dimension} value={dimension}>
                          {t(`units.dimension.${dimension}`)}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </Field>
                )}
              />

              <Controller
                control={form.control}
                name="decimalPlaces"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>
                      {t("units.form.decimalPlaces.label")}
                    </FieldLabel>

                    <Input
                      {...field}
                      aria-invalid={fieldState.invalid}
                      id={field.name}
                      onChange={(event) =>
                        field.onChange(event.target.value === "" ? 0 : Number(event.target.value))
                      }
                      type="number"
                      value={field.value ?? 0}
                    />

                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <Controller
                control={form.control}
                name="conversionFactor"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>
                      {t("units.form.conversionFactor.label")}
                    </FieldLabel>

                    <Input
                      {...field}
                      aria-invalid={fieldState.invalid}
                      id={field.name}
                      onChange={(event) =>
                        field.onChange(event.target.value === "" ? "" : Number(event.target.value))
                      }
                      placeholder={t("units.form.conversionFactor.placeholder")}
                      type="number"
                      value={field.value ?? ""}
                    />

                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            </div>

            <Controller
              control={form.control}
              name="status"
              render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor={field.name}>{t("units.form.status.label")}</FieldLabel>

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

            <Button disabled={form.formState.isSubmitting} type="submit">
              {form.formState.isSubmitting ? t("items.form.submitting") : t("units.form.submit")}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
