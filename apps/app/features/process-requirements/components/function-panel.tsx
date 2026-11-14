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
  createProcessFunctionAction,
  deleteProcessFunctionAction,
  linkFunctionRequirementAction,
  unlinkFunctionRequirementAction,
  updateProcessFunctionAction,
} from "../actions";
import type { ProcessFunctionRecord } from "../repository";
import type { ProcessFunctionFormValues } from "../schema";
import { processFunctionFormSchema } from "../schema";

type FunctionPanelProps = {
  revisionId: string;
  functions: ProcessFunctionRecord[];

  /** Bağlanabilecek gereklilikler. */
  requirements: { id: string; code: string; name: string }[];

  /** Fonksiyonların bağlı olduğu gereklilikler (fonksiyon id → gereklilikler). */
  links: Record<string, string[]>;

  /** Work element seçim listesi (`WORK_ELEMENT` kapsamlı fonksiyonlar için). */
  workElements: { id: string; code: string; name: string }[];

  editable: boolean;
};

/**
 * Proses fonksiyonları paneli.
 *
 * Fonksiyonlar proses seviyesinde ya da tek bir iş unsuruna bağlı
 * tanımlanabilir ve gerekliliklerle ilişkilendirilebilir.
 */
export function FunctionPanel({
  revisionId,
  functions,
  requirements,
  links,
  workElements,
  editable,
}: FunctionPanelProps) {
  const router = useRouter();
  const { t } = useI18n();
  const [editingId, setEditingId] = useState<string | null>(null);

  const form = useForm<ProcessFunctionFormValues>({
    resolver: zodResolver(processFunctionFormSchema),
    defaultValues: {
      processVariantRevisionId: revisionId,
      name: "",
      description: "",
      functionScope: "PROCESS",
      processWorkElementId: null,
    },
  });

  const editing = functions.find((entry) => entry.id === editingId);

  async function onSubmit(values: ProcessFunctionFormValues) {
    form.clearErrors("root");

    const result = editing
      ? await updateProcessFunctionAction(editing.id, values)
      : await createProcessFunctionAction(values);

    if (!result.success) {
      form.setError("root", { message: result.error });
      toast.error(result.error);
      return;
    }

    toast.success(
      t(editing ? "processFunctions.actions.updated" : "processFunctions.actions.created"),
    );

    reset();
    router.refresh();
  }

  function reset() {
    setEditingId(null);

    form.reset({
      processVariantRevisionId: revisionId,
      name: "",
      description: "",
      functionScope: "PROCESS",
      processWorkElementId: null,
    });
  }

  async function remove(id: string) {
    const result = await deleteProcessFunctionAction(id);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success(t("processFunctions.actions.removed"));

    if (editingId === id) {
      reset();
    }

    router.refresh();
  }

  async function toggleRequirement(functionId: string, requirementId: string, linked: boolean) {
    const result = linked
      ? await unlinkFunctionRequirementAction({
          processFunctionId: functionId,
          processRequirementId: requirementId,
        })
      : await linkFunctionRequirementAction({
          processFunctionId: functionId,
          processRequirementId: requirementId,
        });

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    router.refresh();
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>
            {t(editing ? "processFunctions.form.editTitle" : "processFunctions.form.title")}
          </CardTitle>

          <CardDescription>{t("processFunctions.form.description")}</CardDescription>
        </CardHeader>

        <CardContent>
          <form noValidate onSubmit={form.handleSubmit(onSubmit)}>
            <FieldGroup>
              {form.formState.errors.root && <FieldError errors={[form.formState.errors.root]} />}

              <div className="grid gap-5 sm:grid-cols-2">
                <Controller
                  control={form.control}
                  name="name"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor={field.name}>
                        {t("processFunctions.form.name.label")}
                      </FieldLabel>

                      <Input
                        {...field}
                        aria-invalid={fieldState.invalid}
                        id={field.name}
                        placeholder={t("processFunctions.form.name.placeholder")}
                      />

                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />

                <Controller
                  control={form.control}
                  name="functionScope"
                  render={({ field }) => (
                    <Field>
                      <FieldLabel htmlFor={field.name}>
                        {t("processFunctions.form.scope.label")}
                      </FieldLabel>

                      <NativeSelect
                        {...field}
                        id={field.name}
                        onChange={(event) => {
                          field.onChange(event.target.value);
                          form.setValue("processWorkElementId", null);
                        }}
                      >
                        <NativeSelectOption value="PROCESS">
                          {t("processFunctions.scopes.PROCESS")}
                        </NativeSelectOption>

                        <NativeSelectOption value="WORK_ELEMENT">
                          {t("processFunctions.scopes.WORK_ELEMENT")}
                        </NativeSelectOption>
                      </NativeSelect>
                    </Field>
                  )}
                />
              </div>

              <Controller
                control={form.control}
                name="processWorkElementId"
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor={field.name}>
                      {t("processFunctions.form.workElement.label")}
                    </FieldLabel>

                    <NativeSelect
                      disabled={form.watch("functionScope") !== "WORK_ELEMENT"}
                      id={field.name}
                      onChange={(event) => field.onChange(event.target.value || null)}
                      value={field.value ?? ""}
                    >
                      <NativeSelectOption value="">
                        {t("processFunctions.form.workElement.none")}
                      </NativeSelectOption>

                      {workElements.map((entry) => (
                        <NativeSelectOption key={entry.id} value={entry.id}>
                          {entry.code} · {entry.name}
                        </NativeSelectOption>
                      ))}
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
                      {t("processFunctions.form.description.label")}
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
                  {t("processFunctions.form.submit")}
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

      {functions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("processFunctions.list.title")}</CardTitle>
          </CardHeader>

          <CardContent>
            <ul className="divide-y">
              {functions.map((entry) => {
                const linked = links[entry.id] ?? [];

                return (
                  <li className="space-y-2 py-3 text-sm" key={entry.id}>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="font-medium">{entry.name}</span>

                      <span className="text-muted-foreground">
                        {t(`processFunctions.scopes.${entry.functionScope}`)}
                      </span>

                      {editable && (
                        <span className="ml-auto flex gap-2">
                          <Button
                            onClick={() => {
                              setEditingId(entry.id);
                              form.reset({
                                processVariantRevisionId: revisionId,
                                name: entry.name,
                                description: entry.description ?? "",
                                functionScope: entry.functionScope,
                                processWorkElementId: entry.processWorkElementId,
                              });
                            }}
                            size="sm"
                            type="button"
                            variant="outline"
                          >
                            {t("processFunctions.actions.edit")}
                          </Button>

                          <Button
                            onClick={() => remove(entry.id)}
                            size="sm"
                            type="button"
                            variant="destructive"
                          >
                            {t("processFunctions.actions.remove")}
                          </Button>
                        </span>
                      )}
                    </div>

                    {editable && requirements.length > 0 && (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {t("processFunctions.list.requirements")}
                        </span>

                        {requirements.map((requirement) => {
                          const isLinked = linked.includes(requirement.id);

                          return (
                            <Button
                              key={requirement.id}
                              onClick={() => toggleRequirement(entry.id, requirement.id, isLinked)}
                              size="sm"
                              type="button"
                              variant={isLinked ? "default" : "outline"}
                            >
                              {requirement.code}
                            </Button>
                          );
                        })}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
