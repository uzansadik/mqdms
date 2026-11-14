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

import type { ItemGroupFormValues } from "@/features/items/schema";
import { itemGroupFormSchema } from "@/features/items/schema";

import { createItemGroupAction, updateItemGroupAction } from "../actions";

type ItemGroupFormProps = {
  /** Düzenleme modunda grup kaydı. */
  group?: {
    id: string;
    code: string;
    name: string;
    description: string | null;
    parentId: string | null;
    sortOrder: number;
    status: "ACTIVE" | "INACTIVE";
  };

  /** Üst grup seçim listesi. */
  groups: { id: string; code: string; name: string }[];
};

/**
 * Ürün grubu formu.
 *
 * Döngüsel hiyerarşi sunucu tarafında engellenir: bir grubun parent'ı
 * kendisi veya kendi alt grubu olamaz.
 */
export function ItemGroupForm({ group, groups }: ItemGroupFormProps) {
  const router = useRouter();
  const { t } = useI18n();

  const isEdit = Boolean(group);

  const form = useForm<ItemGroupFormValues>({
    resolver: zodResolver(itemGroupFormSchema),
    defaultValues: {
      code: group?.code ?? "",
      name: group?.name ?? "",
      description: group?.description ?? "",
      parentId: group?.parentId ?? "",
      sortOrder: group?.sortOrder ?? 0,
      status: group?.status ?? "ACTIVE",
    },
  });

  async function onSubmit(values: ItemGroupFormValues) {
    form.clearErrors("root");

    const result = group
      ? await updateItemGroupAction(group.id, values)
      : await createItemGroupAction(values);

    if (!result.success) {
      form.setError("root", { message: result.error });
      return;
    }

    if (group) {
      form.reset(values);

      toast.success(t("itemGroups.actions.updated"));

      router.refresh();
      return;
    }

    toast.success(t("itemGroups.actions.created"));

    router.push("/item-groups");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {isEdit ? t("itemGroups.form.edit.title") : t("itemGroups.form.create.title")}
        </CardTitle>

        <CardDescription>{t("itemGroups.form.description")}</CardDescription>
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
                    <FieldLabel htmlFor={field.name}>{t("itemGroups.form.code.label")}</FieldLabel>

                    <Input
                      {...field}
                      aria-invalid={fieldState.invalid}
                      id={field.name}
                      placeholder={t("itemGroups.form.code.placeholder")}
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
                    <FieldLabel htmlFor={field.name}>{t("itemGroups.form.name.label")}</FieldLabel>

                    <Input
                      {...field}
                      aria-invalid={fieldState.invalid}
                      id={field.name}
                      placeholder={t("itemGroups.form.name.placeholder")}
                    />

                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-3">
              <Controller
                control={form.control}
                name="parentId"
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor={field.name}>
                      {t("itemGroups.form.parent.label")}
                    </FieldLabel>

                    <NativeSelect {...field} id={field.name}>
                      <NativeSelectOption value="">
                        {t("itemGroups.form.parent.none")}
                      </NativeSelectOption>

                      {groups
                        .filter((option) => option.id !== group?.id)
                        .map((option) => (
                          <NativeSelectOption key={option.id} value={option.id}>
                            {option.code} · {option.name}
                          </NativeSelectOption>
                        ))}
                    </NativeSelect>
                  </Field>
                )}
              />

              <Controller
                control={form.control}
                name="sortOrder"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>
                      {t("itemGroups.form.sortOrder.label")}
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
                name="status"
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor={field.name}>
                      {t("itemGroups.form.status.label")}
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
                    {t("itemGroups.form.description.label")}
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
                : isEdit
                  ? t("itemGroups.form.submit.update")
                  : t("itemGroups.form.submit.create")}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
