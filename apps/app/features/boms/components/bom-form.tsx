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

import { createBomAction, updateBomAction } from "../actions";
import type { BomFormValues } from "../schema";
import { bomFormSchema } from "../schema";

const BOM_TYPES = ["MANUFACTURING", "ENGINEERING", "OTHER"] as const;

type BomFormProps = {
  /** Düzenleme modunda BOM kaydı. */
  bom?: {
    id: string;
    itemId: string;
    code: string;
    name: string;
    description: string | null;
    bomType: "MANUFACTURING" | "ENGINEERING" | "OTHER";
    status: "ACTIVE" | "INACTIVE";
  };

  /** Ürün seçim listesi (BOM sahibi). */
  items: { id: string; code: string; name: string }[];
};

/**
 * BOM formu.
 *
 * BOM'un sahibi bir **ürün**'dür: bir item birden fazla BOM tanımına sahip
 * olabilir, hangisinin kullanılacağı kullanım yerinde açıkça seçilir.
 */
export function BomForm({ bom, items }: BomFormProps) {
  const router = useRouter();
  const { t } = useI18n();

  const isEdit = Boolean(bom);

  const form = useForm<BomFormValues>({
    resolver: zodResolver(bomFormSchema),
    defaultValues: {
      itemId: bom?.itemId ?? "",
      code: bom?.code ?? "",
      name: bom?.name ?? "",
      description: bom?.description ?? "",
      bomType: bom?.bomType ?? "MANUFACTURING",
      status: bom?.status ?? "ACTIVE",
    },
  });

  async function onSubmit(values: BomFormValues) {
    form.clearErrors("root");

    const result = bom ? await updateBomAction(bom.id, values) : await createBomAction(values);

    if (!result.success) {
      form.setError("root", { message: result.error });
      return;
    }

    if (bom) {
      form.reset(values);

      router.refresh();
      return;
    }

    router.push("/boms");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEdit ? t("boms.form.edit.title") : t("boms.form.create.title")}</CardTitle>

        <CardDescription>{t("boms.form.description")}</CardDescription>
      </CardHeader>

      <CardContent>
        <form noValidate onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup>
            {form.formState.errors.root && <FieldError errors={[form.formState.errors.root]} />}

            <Controller
              control={form.control}
              name="itemId"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>{t("boms.form.item.label")}</FieldLabel>

                  <NativeSelect {...field} aria-invalid={fieldState.invalid} id={field.name}>
                    <NativeSelectOption value="">
                      {t("boms.form.item.placeholder")}
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

            <div className="grid gap-5 sm:grid-cols-2">
              <Controller
                control={form.control}
                name="code"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>{t("boms.form.code.label")}</FieldLabel>

                    <Input
                      {...field}
                      aria-invalid={fieldState.invalid}
                      id={field.name}
                      placeholder={t("boms.form.code.placeholder")}
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
                    <FieldLabel htmlFor={field.name}>{t("boms.form.name.label")}</FieldLabel>

                    <Input
                      {...field}
                      aria-invalid={fieldState.invalid}
                      id={field.name}
                      placeholder={t("boms.form.name.placeholder")}
                    />

                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <Controller
                control={form.control}
                name="bomType"
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor={field.name}>{t("boms.form.bomType.label")}</FieldLabel>

                    <NativeSelect {...field} id={field.name}>
                      {BOM_TYPES.map((type) => (
                        <NativeSelectOption key={type} value={type}>
                          {t(`boms.bomType.${type}`)}
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
                    <FieldLabel htmlFor={field.name}>{t("boms.form.status.label")}</FieldLabel>

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
                  <FieldLabel htmlFor={field.name}>{t("boms.form.description.label")}</FieldLabel>

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
                  ? t("boms.form.submit.update")
                  : t("boms.form.submit.create")}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
