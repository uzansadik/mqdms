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
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import {
  createWorkElementAction,
  deleteWorkElementAction,
  updateWorkElementAction,
} from "../actions";
import type { WorkElementRecord } from "../repository";
import type { WorkElementFormValues } from "../schema";
import { workElementFormSchema } from "../schema";

const CATEGORIES = ["MAN", "MACHINE", "MATERIAL", "ENVIRONMENT"] as const;

type WorkElementPanelProps = {
  /** Ait olduğu revision. */
  revisionId: string;

  /** Revision'ın work element'leri. */
  workElements: WorkElementRecord[];

  /** Item seçim listesi (MATERIAL kategorisi için). */
  items: { id: string; code: string; name: string }[];

  /** Item grup seçim listesi. */
  itemGroups: { id: string; code: string; name: string }[];

  /** Taslak revision mı? */
  editable: boolean;
};

/**
 * Work Element paneli.
 *
 * AIAG–VDA 4M kategorilerinde operatör, ekipman, malzeme ve ortam kayıtları
 * yönetilir. Aynı kategoride birden fazla kayıt oluşturulabilir.
 */
export function WorkElementPanel({
  revisionId,
  workElements,
  items,
  itemGroups,
  editable,
}: WorkElementPanelProps) {
  const router = useRouter();
  const { t } = useI18n();
  const [editingId, setEditingId] = useState<string | null>(null);

  const form = useForm<WorkElementFormValues>({
    resolver: zodResolver(workElementFormSchema),
    defaultValues: {
      processVariantRevisionId: revisionId,
      code: "",
      name: "",
      description: "",
      category: "MAN",
      itemId: null,
      itemGroupId: null,
    },
  });

  const editing = workElements.find((entry) => entry.id === editingId);

  async function onSubmit(values: WorkElementFormValues) {
    form.clearErrors("root");

    const result = editing
      ? await updateWorkElementAction(editing.id, values)
      : await createWorkElementAction(values);

    if (!result.success) {
      form.setError("root", { message: result.error });
      toast.error(result.error);
      return;
    }

    toast.success(t(editing ? "workElements.actions.updated" : "workElements.actions.created"));

    setEditingId(null);
    form.reset({
      processVariantRevisionId: revisionId,
      code: "",
      name: "",
      description: "",
      category: "MAN",
      itemId: null,
      itemGroupId: null,
    });

    router.refresh();
  }

  function startEdit(entry: WorkElementRecord) {
    setEditingId(entry.id);

    form.reset({
      processVariantRevisionId: revisionId,
      code: entry.code,
      name: entry.name,
      description: entry.description ?? "",
      category: entry.category,
      itemId: entry.itemId,
      itemGroupId: entry.itemGroupId,
    });
  }

  function reset() {
    setEditingId(null);

    form.reset({
      processVariantRevisionId: revisionId,
      code: "",
      name: "",
      description: "",
      category: "MAN",
      itemId: null,
      itemGroupId: null,
    });
  }

  async function remove(id: string) {
    const result = await deleteWorkElementAction(id);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success(t("workElements.actions.removed"));

    if (editingId === id) {
      reset();
    }

    router.refresh();
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>
            {t(editing ? "workElements.form.editTitle" : "workElements.form.title")}
          </CardTitle>

          <CardDescription>{t("workElements.form.description")}</CardDescription>
        </CardHeader>

        <CardContent>
          <form noValidate onSubmit={form.handleSubmit(onSubmit)}>
            <FieldGroup>
              {form.formState.errors.root && <FieldError errors={[form.formState.errors.root]} />}

              <div className="grid gap-5 sm:grid-cols-3">
                <Controller
                  control={form.control}
                  name="code"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor={field.name}>
                        {t("workElements.form.code.label")}
                      </FieldLabel>

                      <Input
                        {...field}
                        aria-invalid={fieldState.invalid}
                        id={field.name}
                        placeholder={t("workElements.form.code.placeholder")}
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
                      <FieldLabel htmlFor={field.name}>
                        {t("workElements.form.name.label")}
                      </FieldLabel>

                      <Input
                        {...field}
                        aria-invalid={fieldState.invalid}
                        id={field.name}
                        placeholder={t("workElements.form.name.placeholder")}
                      />

                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />

                <Controller
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <Field>
                      <FieldLabel htmlFor={field.name}>
                        {t("workElements.form.category.label")}
                      </FieldLabel>

                      <NativeSelect {...field} id={field.name}>
                        {CATEGORIES.map((category) => (
                          <NativeSelectOption key={category} value={category}>
                            {t(`workElements.categories.${category}`)}
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
                  name="itemId"
                  render={({ field }) => (
                    <Field>
                      <FieldLabel htmlFor={field.name}>
                        {t("workElements.form.item.label")}
                      </FieldLabel>

                      <NativeSelect
                        id={field.name}
                        onChange={(event) => field.onChange(event.target.value || null)}
                        value={field.value ?? ""}
                      >
                        <NativeSelectOption value="">
                          {t("workElements.form.item.none")}
                        </NativeSelectOption>

                        {items.map((item) => (
                          <NativeSelectOption key={item.id} value={item.id}>
                            {item.code} · {item.name}
                          </NativeSelectOption>
                        ))}
                      </NativeSelect>
                    </Field>
                  )}
                />

                <Controller
                  control={form.control}
                  name="itemGroupId"
                  render={({ field }) => (
                    <Field>
                      <FieldLabel htmlFor={field.name}>
                        {t("workElements.form.itemGroup.label")}
                      </FieldLabel>

                      <NativeSelect
                        id={field.name}
                        onChange={(event) => field.onChange(event.target.value || null)}
                        value={field.value ?? ""}
                      >
                        <NativeSelectOption value="">
                          {t("workElements.form.itemGroup.none")}
                        </NativeSelectOption>

                        {itemGroups.map((itemGroup) => (
                          <NativeSelectOption key={itemGroup.id} value={itemGroup.id}>
                            {itemGroup.code} · {itemGroup.name}
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
                      {t("workElements.form.description.label")}
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

              <div className="flex gap-2">
                <Button disabled={!editable || form.formState.isSubmitting} type="submit">
                  {t("workElements.form.submit")}
                </Button>

                {editing && (
                  <Button onClick={reset} type="button" variant="outline">
                    {t("common.cancel")}
                  </Button>
                )}
              </div>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>

      {workElements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("workElements.list.title")}</CardTitle>
          </CardHeader>

          <CardContent>
            <ul className="divide-y">
              {workElements.map((entry) => (
                <li className="flex flex-wrap items-center gap-3 py-2 text-sm" key={entry.id}>
                  <span className="font-medium">{entry.code}</span>

                  <span>{entry.name}</span>

                  <span className="text-muted-foreground">
                    {t(`workElements.categories.${entry.category}`)}
                  </span>

                  {entry.description ? (
                    <span className="text-muted-foreground">{entry.description}</span>
                  ) : null}

                  {editable && (
                    <span className="ml-auto flex gap-2">
                      <Button
                        onClick={() => startEdit(entry)}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        {t("workElements.actions.edit")}
                      </Button>

                      <Button
                        onClick={() => remove(entry.id)}
                        size="sm"
                        type="button"
                        variant="destructive"
                      >
                        {t("workElements.actions.remove")}
                      </Button>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
