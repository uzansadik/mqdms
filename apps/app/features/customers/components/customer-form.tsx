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

import { createCustomerAction, updateCustomerAction } from "../actions";
import type { CustomerFormValues } from "../schema";
import { customerFormSchema } from "../schema";

type CustomerFormProps = {
  /** Düzenleme modunda müşteri kaydı. */
  customer?: {
    id: string;
    code: string;
    name: string;
    legalName: string | null;
    description: string | null;
    website: string | null;
    countryCode: string | null;
    preferredLanguage: string | null;
    status: "ACTIVE" | "INACTIVE";
  };
};

/**
 * Müşteri formu.
 *
 * Oluşturma ve güncelleme aynı formu paylaşır; tek fark sunucudaki aksiyondur.
 * Doğrulama hem istemcide (React Hook Form + Zod) hem sunucuda yapılır.
 */
export function CustomerForm({ customer }: CustomerFormProps) {
  const router = useRouter();
  const { t } = useI18n();

  const isEdit = Boolean(customer);

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      code: customer?.code ?? "",
      name: customer?.name ?? "",
      legalName: customer?.legalName ?? "",
      description: customer?.description ?? "",
      website: customer?.website ?? "",
      countryCode: customer?.countryCode ?? "",
      preferredLanguage: customer?.preferredLanguage ?? "",
      status: customer?.status ?? "ACTIVE",
    },
  });

  async function onSubmit(values: CustomerFormValues) {
    form.clearErrors("root");

    const result = customer
      ? await updateCustomerAction(customer.id, values)
      : await createCustomerAction(values);

    if (!result.success) {
      form.setError("root", { message: result.error });
      return;
    }

    form.reset();

    if (customer) {
      router.refresh();
      return;
    }

    router.push("/customers");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {isEdit ? t("customers.form.edit.title") : t("customers.form.create.title")}
        </CardTitle>

        <CardDescription>{t("customers.form.description")}</CardDescription>
      </CardHeader>

      <CardContent>
        <form noValidate onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup>
            {form.formState.errors.root && <FieldError errors={[form.formState.errors.root]} />}

            <Controller
              control={form.control}
              name="code"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>{t("customers.form.code.label")}</FieldLabel>

                  <Input
                    {...field}
                    aria-invalid={fieldState.invalid}
                    id={field.name}
                    placeholder={t("customers.form.code.placeholder")}
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
                  <FieldLabel htmlFor={field.name}>{t("customers.form.name.label")}</FieldLabel>

                  <Input
                    {...field}
                    aria-invalid={fieldState.invalid}
                    id={field.name}
                    placeholder={t("customers.form.name.placeholder")}
                  />

                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <Controller
              control={form.control}
              name="legalName"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>
                    {t("customers.form.legalName.label")}
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

            <div className="grid gap-5 sm:grid-cols-2">
              <Controller
                control={form.control}
                name="countryCode"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>
                      {t("customers.form.countryCode.label")}
                    </FieldLabel>

                    <Input
                      {...field}
                      aria-invalid={fieldState.invalid}
                      id={field.name}
                      maxLength={2}
                      placeholder={t("customers.form.countryCode.placeholder")}
                      value={field.value ?? ""}
                    />

                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <Controller
                control={form.control}
                name="preferredLanguage"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>
                      {t("customers.form.preferredLanguage.label")}
                    </FieldLabel>

                    <Input
                      {...field}
                      aria-invalid={fieldState.invalid}
                      id={field.name}
                      placeholder={t("customers.form.preferredLanguage.placeholder")}
                      value={field.value ?? ""}
                    />

                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            </div>

            <Controller
              control={form.control}
              name="website"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>{t("customers.form.website.label")}</FieldLabel>

                  <Input
                    {...field}
                    aria-invalid={fieldState.invalid}
                    id={field.name}
                    placeholder={t("customers.form.website.placeholder")}
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
                    {t("customers.form.description.label")}
                  </FieldLabel>

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

            <Controller
              control={form.control}
              name="status"
              render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor={field.name}>{t("customers.form.status.label")}</FieldLabel>

                  <NativeSelect {...field} id={field.name}>
                    <NativeSelectOption value="ACTIVE">
                      {t("customers.status.ACTIVE")}
                    </NativeSelectOption>

                    <NativeSelectOption value="INACTIVE">
                      {t("customers.status.INACTIVE")}
                    </NativeSelectOption>
                  </NativeSelect>
                </Field>
              )}
            />

            <div className="flex gap-2">
              <Button disabled={form.formState.isSubmitting} type="submit">
                {form.formState.isSubmitting
                  ? t("customers.form.submitting")
                  : isEdit
                    ? t("customers.form.submit.update")
                    : t("customers.form.submit.create")}
              </Button>
            </div>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
