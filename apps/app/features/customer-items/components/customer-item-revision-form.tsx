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

import { createCustomerItemRevisionAction } from "../actions";
import type { CustomerItemRevisionFormValues } from "../schema";
import { customerItemRevisionFormSchema } from "../schema";

type CustomerItemRevisionFormProps = {
  /** Müşteri ürünü; sunucudan gelir. */
  customerItemId: string;

  /** Ürünün kendi revision'ları (iç revision eşleştirmesi için). */
  internalRevisions: { id: string; revision: string; status: string }[];
};

/**
 * Müşteri revision eşleştirme formu.
 *
 * Müşteri revision'ı, müşteri ürün revizyonu ve iç ürün revizyonu ayrı
 * saklanır; zorunlu bir birebir eşitlik yoktur.
 */
export function CustomerItemRevisionForm({
  customerItemId,
  internalRevisions,
}: CustomerItemRevisionFormProps) {
  const router = useRouter();
  const { t } = useI18n();

  const form = useForm<CustomerItemRevisionFormValues>({
    resolver: zodResolver(customerItemRevisionFormSchema),
    defaultValues: {
      customerItemId,
      customerRevision: "",
      internalItemRevisionId: "",
      drawingReference: "",
      drawingRevision: "",
      description: "",
      status: "DRAFT",
      effectiveFrom: "",
    },
  });

  async function onSubmit(values: CustomerItemRevisionFormValues) {
    form.clearErrors("root");

    const result = await createCustomerItemRevisionAction(values);

    if (!result.success) {
      form.setError("root", { message: result.error });
      return;
    }

    toast.success(t("customerItems.revisions.actions.created"));

    form.reset({
      ...values,
      customerRevision: "",
      drawingReference: "",
      drawingRevision: "",
      description: "",
    });

    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("customerItems.revisions.form.title")}</CardTitle>

        <CardDescription>{t("customerItems.revisions.form.description")}</CardDescription>
      </CardHeader>

      <CardContent>
        <form noValidate onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup>
            {form.formState.errors.root && <FieldError errors={[form.formState.errors.root]} />}

            <div className="grid gap-5 sm:grid-cols-2">
              <Controller
                control={form.control}
                name="customerRevision"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>
                      {t("customerItems.revisions.form.customerRevision.label")}
                    </FieldLabel>

                    <Input
                      {...field}
                      aria-invalid={fieldState.invalid}
                      id={field.name}
                      placeholder={t("customerItems.revisions.form.customerRevision.placeholder")}
                    />

                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <Controller
                control={form.control}
                name="internalItemRevisionId"
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor={field.name}>
                      {t("customerItems.revisions.form.internalRevision.label")}
                    </FieldLabel>

                    <NativeSelect {...field} id={field.name}>
                      <NativeSelectOption value="">
                        {t("customerItems.revisions.form.internalRevision.none")}
                      </NativeSelectOption>

                      {internalRevisions.map((revision) => (
                        <NativeSelectOption key={revision.id} value={revision.id}>
                          {revision.revision}
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
                name="drawingReference"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>
                      {t("customerItems.revisions.form.drawingReference.label")}
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
                name="drawingRevision"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>
                      {t("customerItems.revisions.form.drawingRevision.label")}
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
                name="effectiveFrom"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>
                      {t("customerItems.revisions.form.effectiveFrom.label")}
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
            </div>

            <Controller
              control={form.control}
              name="status"
              render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor={field.name}>
                    {t("customerItems.revisions.form.status.label")}
                  </FieldLabel>

                  <NativeSelect {...field} id={field.name}>
                    <NativeSelectOption value="DRAFT">
                      {t("customerItems.revisions.status.DRAFT")}
                    </NativeSelectOption>

                    <NativeSelectOption value="RELEASED">
                      {t("customerItems.revisions.status.RELEASED")}
                    </NativeSelectOption>

                    <NativeSelectOption value="SUPERSEDED">
                      {t("customerItems.revisions.status.SUPERSEDED")}
                    </NativeSelectOption>
                  </NativeSelect>
                </Field>
              )}
            />

            <Controller
              control={form.control}
              name="description"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>
                    {t("customerItems.revisions.form.description.label")}
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
                : t("customerItems.revisions.form.submit")}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
