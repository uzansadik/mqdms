"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useI18n } from "@mqdms/i18n";
import { toast } from "sonner";
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

import { createItemAction, updateItemAction } from "../actions";
import type { ItemFormValues } from "../schema";
import { itemFormSchema } from "../schema";

const ITEM_TYPES = [
  "FINISHED_GOOD",
  "SEMI_FINISHED",
  "RAW_MATERIAL",
  "COMPONENT",
  "CONSUMABLE",
  "OTHER",
] as const;

const SUPPLY_TYPES = ["MANUFACTURED", "PURCHASED", "OUTSOURCED", "MIXED", "UNKNOWN"] as const;

type ItemFormProps = {
  /** Düzenleme modunda ürün kaydı. */
  item?: {
    id: string;
    code: string;
    name: string;
    description: string | null;
    itemGroupId: string | null;
    itemType: ItemFormValues["itemType"];
    supplyType: ItemFormValues["supplyType"];
    unitOfMeasureId: string;
    status: "ACTIVE" | "INACTIVE";
  };

  /** Ürün grubu seçim listesi. */
  groups: { id: string; code: string; name: string }[];

  /** Birim seçim listesi. */
  units: { id: string; code: string; name: string }[];
};

/**
 * Ürün formu.
 *
 * Ürün kodu birebir saklanır; benzersizlik veritabanında büyük/küçük harf
 * duyarsız yapılır.
 */
export function ItemForm({ item, groups, units }: ItemFormProps) {
  const router = useRouter();
  const { t } = useI18n();

  const isEdit = Boolean(item);

  const form = useForm<ItemFormValues>({
    resolver: zodResolver(itemFormSchema),
    defaultValues: {
      code: item?.code ?? "",
      name: item?.name ?? "",
      description: item?.description ?? "",
      itemGroupId: item?.itemGroupId ?? "",
      itemType: item?.itemType ?? "COMPONENT",
      supplyType: item?.supplyType ?? "",
      unitOfMeasureId: item?.unitOfMeasureId ?? units[0]?.id ?? "",
      status: item?.status ?? "ACTIVE",
    },
  });

  async function onSubmit(values: ItemFormValues) {
    form.clearErrors("root");

    const result = item ? await updateItemAction(item.id, values) : await createItemAction(values);

    if (!result.success) {
      form.setError("root", { message: result.error });
      return;
    }

    if (item) {
      /*
       * Düzenleme sonrası form, **kaydedilen** değerlerle sıfırlanır.
       * Varsayılanlar eski kaydın değerleri olduğu için `reset()` çağırmak
       * bir sonraki kaydın ilk değişikliği geri alırdı.
       */
      form.reset(values);

      toast.success(t("items.actions.updated"));

      router.push("/items");
      router.refresh();
      return;
    }

    toast.success(t("items.actions.created"));

    router.push("/items");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEdit ? t("items.form.edit.title") : t("items.form.create.title")}</CardTitle>

        <CardDescription>{t("items.form.description")}</CardDescription>
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
                    <FieldLabel htmlFor={field.name}>{t("items.form.code.label")}</FieldLabel>

                    <Input
                      {...field}
                      aria-invalid={fieldState.invalid}
                      id={field.name}
                      placeholder={t("items.form.code.placeholder")}
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
                    <FieldLabel htmlFor={field.name}>{t("items.form.name.label")}</FieldLabel>

                    <Input
                      {...field}
                      aria-invalid={fieldState.invalid}
                      id={field.name}
                      placeholder={t("items.form.name.placeholder")}
                    />

                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-3">
              <Controller
                control={form.control}
                name="itemGroupId"
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor={field.name}>{t("items.form.itemGroup.label")}</FieldLabel>

                    <NativeSelect {...field} id={field.name}>
                      <NativeSelectOption value="">
                        {t("items.form.itemGroup.none")}
                      </NativeSelectOption>

                      {groups.map((group) => (
                        <NativeSelectOption key={group.id} value={group.id}>
                          {group.code} · {group.name}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </Field>
                )}
              />

              <Controller
                control={form.control}
                name="itemType"
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor={field.name}>{t("items.form.itemType.label")}</FieldLabel>

                    <NativeSelect {...field} id={field.name}>
                      {ITEM_TYPES.map((type) => (
                        <NativeSelectOption key={type} value={type}>
                          {t(`items.itemType.${type}`)}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </Field>
                )}
              />

              <Controller
                control={form.control}
                name="supplyType"
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor={field.name}>{t("items.form.supplyType.label")}</FieldLabel>

                    <NativeSelect {...field} id={field.name}>
                      <NativeSelectOption value="">
                        {t("items.form.supplyType.none")}
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
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <Controller
                control={form.control}
                name="unitOfMeasureId"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>
                      {t("items.form.unitOfMeasure.label")}
                    </FieldLabel>

                    <NativeSelect {...field} aria-invalid={fieldState.invalid} id={field.name}>
                      {units.map((unit) => (
                        <NativeSelectOption key={unit.id} value={unit.id}>
                          {unit.code} · {unit.name}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>

                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <Controller
                control={form.control}
                name="status"
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor={field.name}>{t("items.form.status.label")}</FieldLabel>

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
                  <FieldLabel htmlFor={field.name}>{t("items.form.description.label")}</FieldLabel>

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
                ? t("items.form.submitting")
                : isEdit
                  ? t("items.form.submit.update")
                  : t("items.form.submit.create")}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
