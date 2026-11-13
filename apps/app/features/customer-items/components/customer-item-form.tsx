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

import { createCustomerItemAction } from "../actions";
import type { CustomerItemFormValues } from "../schema";
import { customerItemFormSchema } from "../schema";

type CustomerItemFormProps = {
  /** Ürün; sunucudan gelir, istemci değiştiremez. */
  itemId: string;

  /** Müşteri seçim listesi. */
  customers: { id: string; code: string; name: string }[];
};

/**
 * Müşteri ürün referansı formu.
 *
 * Müşteri parça numarası şirket içi ürün kodundan **bağımsızdır**: aynı ürün
 * farklı müşterilerde farklı parça numaralarıyla bilinebilir.
 */
export function CustomerItemForm({ itemId, customers }: CustomerItemFormProps) {
  const router = useRouter();
  const { t } = useI18n();

  const form = useForm<CustomerItemFormValues>({
    resolver: zodResolver(customerItemFormSchema),
    defaultValues: {
      customerId: "",
      itemId,
      customerPartNumber: "",
      customerPartName: "",
      description: "",
      scope: "",
      status: "ACTIVE",
    },
  });

  async function onSubmit(values: CustomerItemFormValues) {
    form.clearErrors("root");

    const result = await createCustomerItemAction(values);

    if (!result.success) {
      form.setError("root", { message: result.error });
      return;
    }

    toast.success(t("customerItems.actions.created"));

    form.reset({ ...values, customerPartNumber: "", customerPartName: "", description: "" });

    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("customerItems.form.title")}</CardTitle>

        <CardDescription>{t("customerItems.form.description")}</CardDescription>
      </CardHeader>

      <CardContent>
        <form noValidate onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup>
            {form.formState.errors.root && <FieldError errors={[form.formState.errors.root]} />}

            <div className="grid gap-5 sm:grid-cols-2">
              <Controller
                control={form.control}
                name="customerId"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>
                      {t("customerItems.form.customer.label")}
                    </FieldLabel>

                    <NativeSelect {...field} aria-invalid={fieldState.invalid} id={field.name}>
                      <NativeSelectOption value="">
                        {t("customerItems.form.customer.placeholder")}
                      </NativeSelectOption>

                      {customers.map((customer) => (
                        <NativeSelectOption key={customer.id} value={customer.id}>
                          {customer.code} · {customer.name}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>

                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <Controller
                control={form.control}
                name="customerPartNumber"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>
                      {t("customerItems.form.customerPartNumber.label")}
                    </FieldLabel>

                    <Input
                      {...field}
                      aria-invalid={fieldState.invalid}
                      id={field.name}
                      placeholder={t("customerItems.form.customerPartNumber.placeholder")}
                    />

                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-3">
              <Controller
                control={form.control}
                name="customerPartName"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>
                      {t("customerItems.form.customerPartName.label")}
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
                name="scope"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>
                      {t("customerItems.form.scope.label")}
                    </FieldLabel>

                    <Input
                      {...field}
                      aria-invalid={fieldState.invalid}
                      id={field.name}
                      placeholder={t("customerItems.form.scope.placeholder")}
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
                    <FieldLabel htmlFor={field.name}>
                      {t("customerItems.form.status.label")}
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
                    {t("customerItems.form.description.label")}
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
                : t("customerItems.form.submit")}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
