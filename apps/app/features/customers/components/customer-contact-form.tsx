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

import { createCustomerContactAction } from "../actions";
import type { CustomerContactFormValues } from "../schema";
import { customerContactFormSchema } from "../schema";

type CustomerContactFormProps = {
  customerId: string;
  /** Müşterinin siteleri; boş seçim "müşteri geneli" anlamına gelir. */
  sites: { id: string; name: string }[];
};

/**
 * Müşteri temsilcisi formu.
 *
 * Temsilci bir mQDMS kullanıcısı değildir: bu form kullanıcı veya
 * organizasyon üyeliği oluşturmaz.
 */
export function CustomerContactForm({ customerId, sites }: CustomerContactFormProps) {
  const router = useRouter();
  const { t } = useI18n();

  const form = useForm<CustomerContactFormValues>({
    resolver: zodResolver(customerContactFormSchema),
    defaultValues: {
      customerId,
      customerSiteId: "",
      firstName: "",
      lastName: "",
      jobTitle: "",
      department: "",
      email: "",
      phone: "",
      notes: "",
      contactType: "OTHER",
      status: "ACTIVE",
    },
  });

  async function onSubmit(values: CustomerContactFormValues) {
    form.clearErrors("root");

    const result = await createCustomerContactAction(values);

    if (!result.success) {
      form.setError("root", { message: result.error });
      return;
    }

    toast.success(t("customers.contacts.created"));

    form.reset({
      ...values,
      customerSiteId: "",
      firstName: "",
      lastName: "",
      jobTitle: "",
      department: "",
      email: "",
      phone: "",
      notes: "",
    });

    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("customers.contacts.form.title")}</CardTitle>

        <CardDescription>{t("customers.contacts.form.description")}</CardDescription>
      </CardHeader>

      <CardContent>
        <form noValidate onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup>
            {form.formState.errors.root && <FieldError errors={[form.formState.errors.root]} />}

            <div className="grid gap-5 sm:grid-cols-2">
              <Controller
                control={form.control}
                name="firstName"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>
                      {t("customers.contacts.form.firstName.label")}
                    </FieldLabel>

                    <Input {...field} aria-invalid={fieldState.invalid} id={field.name} />

                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <Controller
                control={form.control}
                name="lastName"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>
                      {t("customers.contacts.form.lastName.label")}
                    </FieldLabel>

                    <Input {...field} aria-invalid={fieldState.invalid} id={field.name} />

                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <Controller
                control={form.control}
                name="jobTitle"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>
                      {t("customers.contacts.form.jobTitle.label")}
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
                name="department"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>
                      {t("customers.contacts.form.department.label")}
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
                name="email"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>
                      {t("customers.contacts.form.email.label")}
                    </FieldLabel>

                    <Input
                      {...field}
                      aria-invalid={fieldState.invalid}
                      id={field.name}
                      type="email"
                      value={field.value ?? ""}
                    />

                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <Controller
                control={form.control}
                name="phone"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>
                      {t("customers.contacts.form.phone.label")}
                    </FieldLabel>

                    <Input
                      {...field}
                      aria-invalid={fieldState.invalid}
                      id={field.name}
                      type="tel"
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
                name="customerSiteId"
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor={field.name}>
                      {t("customers.contacts.form.customerSite.label")}
                    </FieldLabel>

                    <NativeSelect {...field} id={field.name}>
                      <NativeSelectOption value="">
                        {t("customers.contacts.form.customerSite.none")}
                      </NativeSelectOption>

                      {sites.map((site) => (
                        <NativeSelectOption key={site.id} value={site.id}>
                          {site.name}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </Field>
                )}
              />

              <Controller
                control={form.control}
                name="contactType"
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor={field.name}>
                      {t("customers.contacts.form.contactType.label")}
                    </FieldLabel>

                    <NativeSelect {...field} id={field.name}>
                      {(
                        [
                          "QUALITY",
                          "PROJECT",
                          "PURCHASING",
                          "ENGINEERING",
                          "LOGISTICS",
                          "OTHER",
                        ] as const
                      ).map((type) => (
                        <NativeSelectOption key={type} value={type}>
                          {t(`customers.contactType.${type}`)}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </Field>
                )}
              />
            </div>

            <Controller
              control={form.control}
              name="notes"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>
                    {t("customers.contacts.form.notes.label")}
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
                ? t("customers.form.submitting")
                : t("customers.contacts.form.submit")}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
