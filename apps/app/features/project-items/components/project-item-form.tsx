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
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { createProjectItemAction } from "../actions";
import type { ProjectItemFormValues } from "../schema";
import { projectItemFormSchema } from "../schema";

const ITEM_ROLES = ["DELIVERABLE", "COMPONENT", "RAW_MATERIAL", "AUXILIARY"] as const;

const SUPPLY_TYPES = ["MANUFACTURED", "PURCHASED", "OUTSOURCED", "MIXED", "UNKNOWN"] as const;

type ProjectItemFormProps = {
  /** Proje; sunucudan gelir. */
  projectId: string;

  /** Projenin müşterisi; müşteri ürünleri buna göre süzülür. */
  customerId: string;

  /** Item seçim listesi. */
  items: { id: string; code: string; name: string }[];

  /** Item revision'ları. */
  itemRevisions: { id: string; itemId: string; revision: string; status: string }[];

  /** BOM revision'ları. */
  bomRevisions: {
    id: string;
    revision: string;
    itemId: string;
    itemCode: string | null;
    status: string;
  }[];

  /** Müşteri ürün referansları (item'a göre filtrelenir). */
  customerItems: {
    id: string;
    customerId: string;
    customerPartNumber: string;
    customerPartName: string | null;
  }[];
};

/**
 * Projeye ürün ekleme formu.
 *
 * Ürün organizasyonun ortak kütüphanesinden seçilir; proje yeni bir ürün kartı
 * oluşturmaz. Müşteri parça numarası ve revision eşleştirmeleri isteğe bağlıdır.
 */
export function ProjectItemForm({
  projectId,
  customerId,
  items,
  itemRevisions,
  bomRevisions,
  customerItems,
}: ProjectItemFormProps) {
  const router = useRouter();
  const { t } = useI18n();

  const form = useForm<ProjectItemFormValues>({
    resolver: zodResolver(projectItemFormSchema),
    defaultValues: {
      projectId,
      itemId: "",
      itemRevisionId: "",
      customerItemId: "",
      customerItemRevisionId: "",
      bomRevisionId: "",
      itemRole: "COMPONENT",
      supplyTypeOverride: undefined,
      description: "",
      status: "ACTIVE",
    },
  });

  const itemId = useWatch({ control: form.control, name: "itemId" });

  const availableItemRevisions = itemRevisions.filter((revision) => revision.itemId === itemId);

  const availableBomRevisions = bomRevisions.filter((revision) => revision.itemId === itemId);

  const availableCustomerItems = customerItems.filter(
    (customerItem) => customerItem.customerId === customerId,
  );

  async function onSubmit(values: ProjectItemFormValues) {
    form.clearErrors("root");

    const result = await createProjectItemAction(values);

    if (!result.success) {
      form.setError("root", { message: result.error });
      return;
    }

    toast.success(t("projectItems.actions.created"));

    form.reset({
      ...values,
      itemId: "",
      itemRevisionId: "",
      customerItemId: "",
      bomRevisionId: "",
    });

    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("projectItems.form.title")}</CardTitle>

        <CardDescription>{t("projectItems.form.description")}</CardDescription>
      </CardHeader>

      <CardContent>
        <form noValidate onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup>
            {form.formState.errors.root && <FieldError errors={[form.formState.errors.root]} />}

            <div className="grid gap-5 sm:grid-cols-2">
              <Controller
                control={form.control}
                name="itemId"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>
                      {t("projectItems.form.item.label")}
                    </FieldLabel>

                    <NativeSelect
                      {...field}
                      aria-invalid={fieldState.invalid}
                      id={field.name}
                      onChange={(event) => {
                        field.onChange(event.target.value);
                        form.setValue("itemRevisionId", "");
                        form.setValue("customerItemId", "");
                        form.setValue("bomRevisionId", "");
                      }}
                    >
                      <NativeSelectOption value="">
                        {t("projectItems.form.item.placeholder")}
                      </NativeSelectOption>

                      {items.map((item) => (
                        <NativeSelectOption key={item.id} value={item.id}>
                          {item.code} · {item.name}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>

                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <Controller
                control={form.control}
                name="itemRole"
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor={field.name}>
                      {t("projectItems.form.itemRole.label")}
                    </FieldLabel>

                    <NativeSelect {...field} id={field.name}>
                      {ITEM_ROLES.map((role) => (
                        <NativeSelectOption key={role} value={role}>
                          {t(`projectItems.role.${role}`)}
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
                name="itemRevisionId"
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor={field.name}>
                      {t("projectItems.form.itemRevision.label")}
                    </FieldLabel>

                    <NativeSelect {...field} id={field.name}>
                      <NativeSelectOption value="">
                        {t("projectItems.form.itemRevision.none")}
                      </NativeSelectOption>

                      {availableItemRevisions.map((revision) => (
                        <NativeSelectOption key={revision.id} value={revision.id}>
                          {revision.revision}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </Field>
                )}
              />

              <Controller
                control={form.control}
                name="customerItemId"
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor={field.name}>
                      {t("projectItems.form.customerItem.label")}
                    </FieldLabel>

                    <NativeSelect {...field} id={field.name}>
                      <NativeSelectOption value="">
                        {t("projectItems.form.customerItem.none")}
                      </NativeSelectOption>

                      {availableCustomerItems.map((customerItem) => (
                        <NativeSelectOption key={customerItem.id} value={customerItem.id}>
                          {customerItem.customerPartNumber}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </Field>
                )}
              />

              <Controller
                control={form.control}
                name="bomRevisionId"
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor={field.name}>
                      {t("projectItems.form.bomRevision.label")}
                    </FieldLabel>

                    <NativeSelect {...field} id={field.name}>
                      <NativeSelectOption value="">
                        {t("projectItems.form.bomRevision.none")}
                      </NativeSelectOption>

                      {availableBomRevisions.map((revision) => (
                        <NativeSelectOption key={revision.id} value={revision.id}>
                          {revision.revision}
                          {revision.itemCode ? ` · ${revision.itemCode}` : ""}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </Field>
                )}
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <Controller
                control={form.control}
                name="supplyTypeOverride"
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor={field.name}>
                      {t("projectItems.form.supplyTypeOverride.label")}
                    </FieldLabel>

                    <NativeSelect {...field} id={field.name}>
                      <NativeSelectOption value="">
                        {t("projectItems.form.supplyTypeOverride.none")}
                      </NativeSelectOption>

                      {SUPPLY_TYPES.map((type) => (
                        <NativeSelectOption key={type} value={type}>
                          {t(`items.supplyType.${type}`)}
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
                    <FieldLabel htmlFor={field.name}>
                      {t("projectItems.form.status.label")}
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
                    {t("projectItems.form.description.label")}
                  </FieldLabel>

                  <Textarea
                    {...field}
                    aria-invalid={fieldState.invalid}
                    id={field.name}
                    rows={2}
                    value={field.value ?? ""}
                  />

                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <Button disabled={form.formState.isSubmitting} type="submit">
              {form.formState.isSubmitting
                ? t("items.form.submitting")
                : t("projectItems.form.submit")}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
