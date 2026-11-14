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
  createProcessRequirementAction,
  deleteProcessRequirementAction,
  updateProcessRequirementAction,
} from "../actions";
import type { ProcessRequirementRecord } from "../repository";
import type { ProcessRequirementFormValues } from "../schema";
import { processRequirementFormSchema } from "../schema";

const REQUIREMENT_TYPES = [
  "PRODUCT",
  "PROCESS",
  "CUSTOMER",
  "REGULATORY",
  "INTERNAL",
  "DOCUMENTATION",
] as const;

type RequirementPanelProps = {
  revisionId: string;
  requirements: ProcessRequirementRecord[];
  editable: boolean;
};

/**
 * Proses gereklilikleri paneli.
 *
 * Gereklilikler müşteri veya proje bağlamına ait karakteristik değerler
 * zorunlu tutmaz; jenerik kütüphanede tanımlanan ölçütler sonraki
 * fazlarda projeye aktarılır.
 */
export function RequirementPanel({ revisionId, requirements, editable }: RequirementPanelProps) {
  const router = useRouter();
  const { t } = useI18n();
  const [editingId, setEditingId] = useState<string | null>(null);

  const form = useForm<ProcessRequirementFormValues>({
    resolver: zodResolver(processRequirementFormSchema),
    defaultValues: {
      processVariantRevisionId: revisionId,
      code: "",
      name: "",
      description: "",
      requirementType: "PROCESS",
      sourceReference: "",
      isMandatory: true,
    },
  });

  const editing = requirements.find((entry) => entry.id === editingId);

  async function onSubmit(values: ProcessRequirementFormValues) {
    form.clearErrors("root");

    const result = editing
      ? await updateProcessRequirementAction(editing.id, values)
      : await createProcessRequirementAction(values);

    if (!result.success) {
      form.setError("root", { message: result.error });
      toast.error(result.error);
      return;
    }

    toast.success(
      t(editing ? "processRequirements.actions.updated" : "processRequirements.actions.created"),
    );

    reset();
    router.refresh();
  }

  function reset() {
    setEditingId(null);

    form.reset({
      processVariantRevisionId: revisionId,
      code: "",
      name: "",
      description: "",
      requirementType: "PROCESS",
      sourceReference: "",
      isMandatory: true,
    });
  }

  async function remove(id: string) {
    const result = await deleteProcessRequirementAction(id);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success(t("processRequirements.actions.removed"));

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
            {t(editing ? "processRequirements.form.editTitle" : "processRequirements.form.title")}
          </CardTitle>

          <CardDescription>{t("processRequirements.form.description")}</CardDescription>
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
                        {t("processRequirements.form.code.label")}
                      </FieldLabel>

                      <Input
                        {...field}
                        aria-invalid={fieldState.invalid}
                        id={field.name}
                        placeholder={t("processRequirements.form.code.placeholder")}
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
                        {t("processRequirements.form.name.label")}
                      </FieldLabel>

                      <Input
                        {...field}
                        aria-invalid={fieldState.invalid}
                        id={field.name}
                        placeholder={t("processRequirements.form.name.placeholder")}
                      />

                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />

                <Controller
                  control={form.control}
                  name="requirementType"
                  render={({ field }) => (
                    <Field>
                      <FieldLabel htmlFor={field.name}>
                        {t("processRequirements.form.type.label")}
                      </FieldLabel>

                      <NativeSelect {...field} id={field.name}>
                        {REQUIREMENT_TYPES.map((type) => (
                          <NativeSelectOption key={type} value={type}>
                            {t(`processRequirements.types.${type}`)}
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
                  name="sourceReference"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor={field.name}>
                        {t("processRequirements.form.sourceReference.label")}
                      </FieldLabel>

                      <Input
                        {...field}
                        aria-invalid={fieldState.invalid}
                        id={field.name}
                        placeholder={t("processRequirements.form.sourceReference.placeholder")}
                      />

                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />

                <Controller
                  control={form.control}
                  name="isMandatory"
                  render={({ field }) => (
                    <Field orientation="horizontal">
                      <input
                        checked={field.value}
                        className="size-4 rounded border"
                        id={field.name}
                        onChange={(event) => field.onChange(event.target.checked)}
                        type="checkbox"
                      />

                      <FieldLabel htmlFor={field.name}>
                        {t("processRequirements.form.isMandatory.label")}
                      </FieldLabel>
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
                      {t("processRequirements.form.description.label")}
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
                  {t("processRequirements.form.submit")}
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

      {requirements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("processRequirements.list.title")}</CardTitle>
          </CardHeader>

          <CardContent>
            <ul className="divide-y">
              {requirements.map((entry) => (
                <li className="flex flex-wrap items-center gap-3 py-2 text-sm" key={entry.id}>
                  <span className="font-medium">{entry.code}</span>

                  <span>{entry.name}</span>

                  <span className="text-muted-foreground">
                    {t(`processRequirements.types.${entry.requirementType}`)}
                  </span>

                  {entry.sourceReference ? (
                    <span className="text-muted-foreground">{entry.sourceReference}</span>
                  ) : null}

                  {editable && (
                    <span className="ml-auto flex gap-2">
                      <Button
                        onClick={() => {
                          setEditingId(entry.id);
                          form.reset({
                            processVariantRevisionId: revisionId,
                            code: entry.code,
                            name: entry.name,
                            description: entry.description ?? "",
                            requirementType: entry.requirementType,
                            sourceReference: entry.sourceReference ?? "",
                            isMandatory: entry.isMandatory,
                          });
                        }}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        {t("processRequirements.actions.edit")}
                      </Button>

                      <Button
                        onClick={() => remove(entry.id)}
                        size="sm"
                        type="button"
                        variant="destructive"
                      >
                        {t("processRequirements.actions.remove")}
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
