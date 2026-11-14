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

import { createCustomerSiteAction, updateCustomerSiteAction } from "../actions";
import type { CustomerSiteFormValues } from "../schema";
import { customerSiteFormSchema } from "../schema";

type CustomerSiteFormProps = {
  customerId: string;

  /**
   * Düzenlenecek site.
   *
   * Verilirse form düzenleme modunda çalışır: kayıt güncellenir ve form
   * temizlenmez.
   */
  site?: {
    id: string;
    code: string;
    name: string;
    countryCode: string | null;
    city: string | null;
    address: string | null;
    postalCode: string | null;
    description: string | null;
    status: "ACTIVE" | "INACTIVE";
  };

  /**
   * Yüzey biçimi.
   *
   * `card` liste sayfasındaki ekleme formu, `bare` ise diyalog içindeki
   * düzenleme formu için kullanılır.
   */
  surface?: "card" | "bare";
};

/**
 * Müşteri sitesi formu.
 *
 * Site kodu müşteri içinde unique olmalıdır; çakışma sunucuda iş kuralı
 * olarak denetlenir.
 */
export function CustomerSiteForm({ customerId, site, surface = "card" }: CustomerSiteFormProps) {
  const router = useRouter();
  const { t } = useI18n();

  const isEdit = Boolean(site);

  const form = useForm<CustomerSiteFormValues>({
    resolver: zodResolver(customerSiteFormSchema),
    defaultValues: {
      customerId,
      code: site?.code ?? "",
      name: site?.name ?? "",
      countryCode: site?.countryCode ?? "",
      city: site?.city ?? "",
      address: site?.address ?? "",
      postalCode: site?.postalCode ?? "",
      description: site?.description ?? "",
      status: site?.status ?? "ACTIVE",
    },
  });

  async function onSubmit(values: CustomerSiteFormValues) {
    form.clearErrors("root");

    const result = site
      ? await updateCustomerSiteAction(site.id, values)
      : await createCustomerSiteAction(values);

    if (!result.success) {
      form.setError("root", { message: result.error });
      return;
    }

    toast.success(t(site ? "customers.sites.updated" : "customers.sites.created"));

    /*
     * Düzenlemede form temizlenmez: kayıt hâlâ düzenlenebilir durumdadır.
     * Eklemede alanlar yeni kayıt için boşaltılır.
     */
    if (!site) {
      form.reset({
        ...values,
        code: "",
        name: "",
        city: "",
        address: "",
        postalCode: "",
        description: "",
      });
    }

    router.refresh();
  }

  const formBody = (
    <form noValidate onSubmit={form.handleSubmit(onSubmit)}>
      <FieldGroup>
        {form.formState.errors.root && <FieldError errors={[form.formState.errors.root]} />}

        <div className="grid gap-5 sm:grid-cols-2">
          <Controller
            control={form.control}
            name="code"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>{t("customers.sites.form.code.label")}</FieldLabel>

                <Input
                  {...field}
                  aria-invalid={fieldState.invalid}
                  id={field.name}
                  placeholder={t("customers.sites.form.code.placeholder")}
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
                <FieldLabel htmlFor={field.name}>{t("customers.sites.form.name.label")}</FieldLabel>

                <Input
                  {...field}
                  aria-invalid={fieldState.invalid}
                  id={field.name}
                  placeholder={t("customers.sites.form.name.placeholder")}
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
                  {t("customers.sites.form.countryCode.label")}
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
                <FieldLabel htmlFor={field.name}>{t("customers.sites.form.city.label")}</FieldLabel>

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
                  {t("customers.sites.form.postalCode.label")}
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
          name="address"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>
                {t("customers.sites.form.address.label")}
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

        <Controller
          control={form.control}
          name="description"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>
                {t("customers.sites.form.description.label")}
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

        <Controller
          control={form.control}
          name="status"
          render={({ field }) => (
            <Field>
              <FieldLabel htmlFor={field.name}>{t("customers.sites.form.status.label")}</FieldLabel>

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

        <Button disabled={form.formState.isSubmitting} type="submit">
          {form.formState.isSubmitting
            ? t("customers.form.submitting")
            : t("customers.sites.form.submit")}
        </Button>
      </FieldGroup>
    </form>
  );

  if (surface === "bare") {
    return formBody;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("customers.sites.form.title")}</CardTitle>

        <CardDescription>{t("customers.sites.form.description")}</CardDescription>
      </CardHeader>

      <CardContent>{formBody}</CardContent>
    </Card>
  );
}
