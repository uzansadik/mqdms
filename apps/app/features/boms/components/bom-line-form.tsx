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
import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { addBomLineAction } from "../actions";
import type { BomLineFormValues } from "../schema";
import { bomLineFormSchema } from "../schema";

const JOINING_METHODS = ["BONDING", "BOLTING", "WELDING", "RIVETING", "OTHER"] as const;

type BomLineFormProps = {
  /** Satırın ekleneceği revision; sunucudan gelir. */
  bomRevisionId: string;

  /** Bileşen seçim listesi. */
  items: { id: string; code: string; name: string }[];

  /** Ürün revision'ları (iç revision eşleştirmesi için). */
  itemRevisions: { id: string; itemId: string; revision: string; status: string }[];

  /** BOM revision'ları (alt BOM eşleştirmesi için). */
  bomRevisions: {
    id: string;
    revision: string;
    itemId: string;
    itemCode: string | null;
    status: string;
  }[];

  /** Birim seçim listesi. */
  units: { id: string; code: string; name: string }[];
};

/**
 * BOM satırı ekleme formu.
 *
 * Bir bileşen bir BOM içinde **farklı pozisyonlarda birden fazla kez**
 * bulunabilir; bu yüzden satırlar `lineNumber` ile ayırt edilir, bileşen
 * üzerinden unique constraint yoktur.
 *
 * Alt BOM revision'ı seçimi isteğe bağlıdır: seçilmezse ilgili dal
 * çözümlenmemiş olarak gösterilir.
 */
export function BomLineForm({
  bomRevisionId,
  items,
  itemRevisions,
  bomRevisions,
  units,
}: BomLineFormProps) {
  const router = useRouter();
  const { t } = useI18n();

  const form = useForm<BomLineFormValues>({
    resolver: zodResolver(bomLineFormSchema),
    defaultValues: {
      bomRevisionId,
      childItemId: "",
      childItemRevisionId: "",
      childBomRevisionId: "",
      lineNumber: 1,
      quantity: 1,
      unitOfMeasureId: "",
      description: "",
      referenceDesignation: "",
      joiningMethod: undefined,
      notes: "",
      positionReference: "",
    },
  });

  const childItemId = useWatch({ control: form.control, name: "childItemId" });

  const availableItemRevisions = itemRevisions.filter(
    (revision) => revision.itemId === childItemId,
  );

  const availableBomRevisions = bomRevisions.filter((revision) => revision.itemId === childItemId);

  function resetForm() {
    form.reset({
      bomRevisionId,
      childItemId: "",
      childItemRevisionId: "",
      childBomRevisionId: "",
      lineNumber: 1,
      quantity: 1,
      unitOfMeasureId: "",
      description: "",
      referenceDesignation: "",
      joiningMethod: undefined,
      notes: "",
      positionReference: "",
    });
  }

  async function onSubmit(values: BomLineFormValues) {
    form.clearErrors("root");

    const result = await addBomLineAction(values);

    if (!result.success) {
      form.setError("root", { message: result.error });
      return;
    }

    toast.success(t("boms.lines.actions.added"));

    resetForm();

    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("boms.lines.form.title")}</CardTitle>

        <CardDescription>{t("boms.lines.form.description")}</CardDescription>
      </CardHeader>

      <CardContent>
        <form noValidate onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup>
            {form.formState.errors.root && <FieldError errors={[form.formState.errors.root]} />}

            <div className="grid gap-5 sm:grid-cols-3">
              <Controller
                control={form.control}
                name="childItemId"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>
                      {t("boms.lines.form.childItem.label")}
                    </FieldLabel>

                    <NativeSelect
                      {...field}
                      aria-invalid={fieldState.invalid}
                      id={field.name}
                      onChange={(event) => {
                        field.onChange(event.target.value);
                        form.setValue("childItemRevisionId", "");
                        form.setValue("childBomRevisionId", "");
                      }}
                    >
                      <NativeSelectOption value="">
                        {t("boms.lines.form.childItem.placeholder")}
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
                name="lineNumber"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>
                      {t("boms.lines.form.lineNumber.label")}
                    </FieldLabel>

                    <Input
                      {...field}
                      aria-invalid={fieldState.invalid}
                      id={field.name}
                      onChange={(event) =>
                        field.onChange(event.target.value === "" ? 1 : Number(event.target.value))
                      }
                      type="number"
                      value={field.value ?? 1}
                    />

                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <Controller
                control={form.control}
                name="quantity"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>
                      {t("boms.lines.form.quantity.label")}
                    </FieldLabel>

                    <Input
                      {...field}
                      aria-invalid={fieldState.invalid}
                      id={field.name}
                      onChange={(event) =>
                        field.onChange(event.target.value === "" ? 0 : Number(event.target.value))
                      }
                      step="any"
                      type="number"
                      value={field.value ?? 0}
                    />

                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-3">
              <Controller
                control={form.control}
                name="childItemRevisionId"
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor={field.name}>
                      {t("boms.lines.form.childItemRevision.label")}
                    </FieldLabel>

                    <NativeSelect {...field} id={field.name}>
                      <NativeSelectOption value="">
                        {t("boms.lines.form.childItemRevision.none")}
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
                name="childBomRevisionId"
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor={field.name}>
                      {t("boms.lines.form.childBomRevision.label")}
                    </FieldLabel>

                    <NativeSelect {...field} id={field.name}>
                      <NativeSelectOption value="">
                        {t("boms.lines.form.childBomRevision.none")}
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

              <Controller
                control={form.control}
                name="unitOfMeasureId"
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor={field.name}>{t("boms.lines.form.unit.label")}</FieldLabel>

                    <NativeSelect {...field} id={field.name}>
                      <NativeSelectOption value="">
                        {t("boms.lines.form.unit.inherit")}
                      </NativeSelectOption>

                      {units.map((unit) => (
                        <NativeSelectOption key={unit.id} value={unit.id}>
                          {unit.code} · {unit.name}
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
                name="referenceDesignation"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>
                      {t("boms.lines.form.referenceDesignation.label")}
                    </FieldLabel>

                    <Input
                      {...field}
                      aria-invalid={fieldState.invalid}
                      id={field.name}
                      placeholder={t("boms.lines.form.referenceDesignation.placeholder")}
                      value={field.value ?? ""}
                    />

                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <Controller
                control={form.control}
                name="joiningMethod"
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor={field.name}>
                      {t("boms.lines.form.joiningMethod.label")}
                    </FieldLabel>

                    <NativeSelect {...field} id={field.name}>
                      <NativeSelectOption value="">
                        {t("boms.lines.form.joiningMethod.none")}
                      </NativeSelectOption>

                      {JOINING_METHODS.map((method) => (
                        <NativeSelectOption key={method} value={method}>
                          {t(`boms.joiningMethod.${method}`)}
                        </NativeSelectOption>
                      ))}
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
                    {t("boms.lines.form.description.label")}
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
                : t("boms.lines.form.submit")}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
