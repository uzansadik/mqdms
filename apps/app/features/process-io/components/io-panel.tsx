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
  createProcessIoDefinitionAction,
  deleteProcessIoDefinitionAction,
  updateProcessIoDefinitionAction,
} from "../actions";
import type { ProcessIoRecord } from "../repository";
import type { ProcessIoFormValues } from "../schema";
import { processIoFormSchema } from "../schema";

const DIRECTIONS = ["INPUT", "OUTPUT"] as const;

const RESOURCE_TYPES = [
  "PRODUCT",
  "MATERIAL",
  "SEMI_FINISHED",
  "DOCUMENT",
  "INFORMATION",
  "TOOLING",
  "OTHER",
] as const;

type IoPanelProps = {
  revisionId: string;
  definitions: ProcessIoRecord[];
  items: { id: string; code: string; name: string }[];
  itemGroups: { id: string; code: string; name: string }[];
  editable: boolean;
};

/**
 * Proses girdi/çıktı paneli.
 *
 * Tanımlar yalnızca açıklayıcıdır: stok hareketi üretmezler ve yeni yarı
 * mamul oluşturmazlar.
 */
export function IoPanel({ revisionId, definitions, items, itemGroups, editable }: IoPanelProps) {
  const router = useRouter();
  const { t } = useI18n();
  const [editingId, setEditingId] = useState<string | null>(null);

  const form = useForm<ProcessIoFormValues>({
    resolver: zodResolver(processIoFormSchema),
    defaultValues: {
      processVariantRevisionId: revisionId,
      direction: "INPUT",
      resourceType: "MATERIAL",
      name: "",
      description: "",
      itemGroupId: null,
      itemId: null,
      processState: "",
      isRequired: false,
    },
  });

  const editing = definitions.find((entry) => entry.id === editingId);

  async function onSubmit(values: ProcessIoFormValues) {
    form.clearErrors("root");

    const result = editing
      ? await updateProcessIoDefinitionAction(editing.id, values)
      : await createProcessIoDefinitionAction(values);

    if (!result.success) {
      form.setError("root", { message: result.error });
      toast.error(result.error);
      return;
    }

    toast.success(t(editing ? "processIo.actions.updated" : "processIo.actions.created"));

    reset();
    router.refresh();
  }

  function reset() {
    setEditingId(null);

    form.reset({
      processVariantRevisionId: revisionId,
      direction: "INPUT",
      resourceType: "MATERIAL",
      name: "",
      description: "",
      itemGroupId: null,
      itemId: null,
      processState: "",
      isRequired: false,
    });
  }

  async function remove(id: string) {
    const result = await deleteProcessIoDefinitionAction(id);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success(t("processIo.actions.removed"));

    if (editingId === id) {
      reset();
    }

    router.refresh();
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{t(editing ? "processIo.form.editTitle" : "processIo.form.title")}</CardTitle>

          <CardDescription>{t("processIo.form.description")}</CardDescription>
        </CardHeader>

        <CardContent>
          <form noValidate onSubmit={form.handleSubmit(onSubmit)}>
            <FieldGroup>
              {form.formState.errors.root && <FieldError errors={[form.formState.errors.root]} />}

              <div className="grid gap-5 sm:grid-cols-3">
                <Controller
                  control={form.control}
                  name="direction"
                  render={({ field }) => (
                    <Field>
                      <FieldLabel htmlFor={field.name}>
                        {t("processIo.form.direction.label")}
                      </FieldLabel>

                      <NativeSelect {...field} id={field.name}>
                        {DIRECTIONS.map((direction) => (
                          <NativeSelectOption key={direction} value={direction}>
                            {t(`processIo.directions.${direction}`)}
                          </NativeSelectOption>
                        ))}
                      </NativeSelect>
                    </Field>
                  )}
                />

                <Controller
                  control={form.control}
                  name="resourceType"
                  render={({ field }) => (
                    <Field>
                      <FieldLabel htmlFor={field.name}>
                        {t("processIo.form.resourceType.label")}
                      </FieldLabel>

                      <NativeSelect {...field} id={field.name}>
                        {RESOURCE_TYPES.map((type) => (
                          <NativeSelectOption key={type} value={type}>
                            {t(`processIo.resourceTypes.${type}`)}
                          </NativeSelectOption>
                        ))}
                      </NativeSelect>
                    </Field>
                  )}
                />

                <Controller
                  control={form.control}
                  name="name"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor={field.name}>{t("processIo.form.name.label")}</FieldLabel>

                      <Input
                        {...field}
                        aria-invalid={fieldState.invalid}
                        id={field.name}
                        placeholder={t("processIo.form.name.placeholder")}
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
                      <FieldLabel htmlFor={field.name}>
                        {t("processIo.form.itemGroup.label")}
                      </FieldLabel>

                      <NativeSelect
                        id={field.name}
                        onChange={(event) => field.onChange(event.target.value || null)}
                        value={field.value ?? ""}
                      >
                        <NativeSelectOption value="">
                          {t("processIo.form.itemGroup.none")}
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

                <Controller
                  control={form.control}
                  name="itemId"
                  render={({ field }) => (
                    <Field>
                      <FieldLabel htmlFor={field.name}>{t("processIo.form.item.label")}</FieldLabel>

                      <NativeSelect
                        id={field.name}
                        onChange={(event) => field.onChange(event.target.value || null)}
                        value={field.value ?? ""}
                      >
                        <NativeSelectOption value="">
                          {t("processIo.form.item.none")}
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
                  name="processState"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor={field.name}>
                        {t("processIo.form.processState.label")}
                      </FieldLabel>

                      <Input
                        {...field}
                        aria-invalid={fieldState.invalid}
                        id={field.name}
                        placeholder={t("processIo.form.processState.placeholder")}
                      />

                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
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
                      {t("processIo.form.description.label")}
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
                  {t("processIo.form.submit")}
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

      {definitions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("processIo.list.title")}</CardTitle>
          </CardHeader>

          <CardContent>
            <ul className="divide-y">
              {definitions.map((entry) => (
                <li className="flex flex-wrap items-center gap-3 py-2 text-sm" key={entry.id}>
                  <span className="text-muted-foreground">
                    {t(`processIo.directions.${entry.direction}`)}
                  </span>

                  <span className="font-medium">{entry.name}</span>

                  <span className="text-muted-foreground">
                    {t(`processIo.resourceTypes.${entry.resourceType}`)}
                  </span>

                  {entry.processState ? (
                    <span className="text-muted-foreground">{entry.processState}</span>
                  ) : null}

                  {editable && (
                    <span className="ml-auto flex gap-2">
                      <Button
                        onClick={() => {
                          setEditingId(entry.id);
                          form.reset({
                            processVariantRevisionId: revisionId,
                            direction: entry.direction,
                            resourceType: entry.resourceType,
                            name: entry.name,
                            description: entry.description ?? "",
                            itemGroupId: entry.itemGroupId,
                            itemId: entry.itemId,
                            processState: entry.processState ?? "",
                            isRequired: entry.isRequired,
                          });
                        }}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        {t("processIo.actions.edit")}
                      </Button>

                      <Button
                        onClick={() => remove(entry.id)}
                        size="sm"
                        type="button"
                        variant="destructive"
                      >
                        {t("processIo.actions.remove")}
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
