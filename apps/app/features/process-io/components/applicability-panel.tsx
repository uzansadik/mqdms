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
import { Checkbox } from "@mqdms/ui/components/checkbox";
import { Field, FieldError, FieldGroup, FieldLabel } from "@mqdms/ui/components/field";
import { Input } from "@mqdms/ui/components/input";
import { NativeSelect, NativeSelectOption } from "@mqdms/ui/components/native-select";
import { Textarea } from "@mqdms/ui/components/textarea";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { createProcessApplicabilityAction, deleteProcessApplicabilityAction } from "../actions";
import type { ProcessApplicabilityRecord } from "../repository";
import type { ProcessApplicabilityFormValues } from "../schema";
import { processApplicabilityFormSchema } from "../schema";

const SUPPLY_TYPES = ["MANUFACTURED", "PURCHASED", "OUTSOURCED", "MIXED", "UNKNOWN"] as const;

const JOINING_METHODS = ["BONDING", "BOLTING", "WELDING", "RIVETING", "OTHER"] as const;

type ApplicabilityPanelProps = {
  revisionId: string;
  applicabilities: (ProcessApplicabilityRecord & { itemGroupIds: string[] })[];
  itemGroups: { id: string; code: string; name: string }[];
  editable: boolean;
};

/**
 * Applicability paneli.
 *
 * Varyantın hangi malzeme ve üretim koşullarında uygulanabilir olduğunu
 * tanımlar. Bilinmeyen tedarik şekli otomatik olarak `PURCHASED` kabul
 * edilmez.
 */
export function ApplicabilityPanel({
  revisionId,
  applicabilities,
  itemGroups,
  editable,
}: ApplicabilityPanelProps) {
  const router = useRouter();
  const { t } = useI18n();
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);

  const form = useForm<ProcessApplicabilityFormValues>({
    resolver: zodResolver(processApplicabilityFormSchema),
    defaultValues: {
      processVariantRevisionId: revisionId,
      name: "",
      description: "",
      supplyType: null,
      joiningMethod: null,
      isActive: true,
      itemGroupIds: [],
    },
  });

  async function onSubmit(values: ProcessApplicabilityFormValues) {
    form.clearErrors("root");

    const result = await createProcessApplicabilityAction({
      ...values,
      itemGroupIds: selectedGroups,
    });

    if (!result.success) {
      form.setError("root", { message: result.error });
      toast.error(result.error);
      return;
    }

    toast.success(t("processApplicability.actions.created"));

    setSelectedGroups([]);
    form.reset({
      processVariantRevisionId: revisionId,
      name: "",
      description: "",
      supplyType: null,
      joiningMethod: null,
      isActive: true,
      itemGroupIds: [],
    });

    router.refresh();
  }

  async function remove(id: string) {
    const result = await deleteProcessApplicabilityAction(id);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success(t("processApplicability.actions.removed"));

    router.refresh();
  }

  function toggleGroup(id: string) {
    setSelectedGroups((current) =>
      current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id],
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{t("processApplicability.form.title")}</CardTitle>

          <CardDescription>{t("processApplicability.form.description")}</CardDescription>
        </CardHeader>

        <CardContent>
          <form noValidate onSubmit={form.handleSubmit(onSubmit)}>
            <FieldGroup>
              {form.formState.errors.root && <FieldError errors={[form.formState.errors.root]} />}

              <div className="grid gap-5 sm:grid-cols-3">
                <Controller
                  control={form.control}
                  name="name"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor={field.name}>
                        {t("processApplicability.form.name.label")}
                      </FieldLabel>

                      <Input
                        {...field}
                        aria-invalid={fieldState.invalid}
                        id={field.name}
                        placeholder={t("processApplicability.form.name.placeholder")}
                      />

                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />

                <Controller
                  control={form.control}
                  name="supplyType"
                  render={({ field }) => (
                    <Field>
                      <FieldLabel htmlFor={field.name}>
                        {t("processApplicability.form.supplyType.label")}
                      </FieldLabel>

                      <NativeSelect
                        id={field.name}
                        onChange={(event) =>
                          field.onChange(event.target.value === "" ? null : event.target.value)
                        }
                        value={field.value ?? ""}
                      >
                        <NativeSelectOption value="">
                          {t("processApplicability.form.supplyType.none")}
                        </NativeSelectOption>

                        {SUPPLY_TYPES.map((supplyType) => (
                          <NativeSelectOption key={supplyType} value={supplyType}>
                            {t(`items.supplyType.${supplyType}`)}
                          </NativeSelectOption>
                        ))}
                      </NativeSelect>
                    </Field>
                  )}
                />

                <Controller
                  control={form.control}
                  name="joiningMethod"
                  render={({ field }) => (
                    <Field>
                      <FieldLabel htmlFor={field.name}>
                        {t("processApplicability.form.joiningMethod.label")}
                      </FieldLabel>

                      <NativeSelect
                        id={field.name}
                        onChange={(event) =>
                          field.onChange(event.target.value === "" ? null : event.target.value)
                        }
                        value={field.value ?? ""}
                      >
                        <NativeSelectOption value="">
                          {t("processApplicability.form.joiningMethod.none")}
                        </NativeSelectOption>

                        {JOINING_METHODS.map((joiningMethod) => (
                          <NativeSelectOption key={joiningMethod} value={joiningMethod}>
                            {t(`boms.joiningMethod.${joiningMethod}`)}
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
                      {t("processApplicability.form.description.label")}
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

              <Field>
                <FieldLabel>{t("processApplicability.form.itemGroups.label")}</FieldLabel>

                <div className="flex flex-wrap gap-2">
                  {itemGroups.map((itemGroup) => {
                    const checked = selectedGroups.includes(itemGroup.id);
                    const checkboxId = `applicability-group-${itemGroup.id}`;

                    return (
                      <div
                        className="flex items-center gap-2 rounded-md border px-2 py-1 text-sm"
                        key={itemGroup.id}
                      >
                        <Checkbox
                          checked={checked}
                          id={checkboxId}
                          onCheckedChange={() => toggleGroup(itemGroup.id)}
                        />

                        <label className="cursor-pointer" htmlFor={checkboxId}>
                          {itemGroup.code} · {itemGroup.name}
                        </label>
                      </div>
                    );
                  })}
                </div>
              </Field>

              <Button disabled={!editable || form.formState.isSubmitting} type="submit">
                {t("processApplicability.form.submit")}
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>

      {applicabilities.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("processApplicability.list.title")}</CardTitle>
          </CardHeader>

          <CardContent>
            <ul className="divide-y">
              {applicabilities.map((entry) => (
                <li className="flex flex-wrap items-center gap-3 py-2 text-sm" key={entry.id}>
                  <span className="font-medium">{entry.name}</span>

                  {entry.supplyType ? (
                    <span className="text-muted-foreground">
                      {t(`items.supplyType.${entry.supplyType}`)}
                    </span>
                  ) : null}

                  {entry.joiningMethod ? (
                    <span className="text-muted-foreground">
                      {t(`boms.joiningMethod.${entry.joiningMethod}`)}
                    </span>
                  ) : null}

                  <span className="text-muted-foreground">
                    {t("processApplicability.list.itemGroupCount", {
                      count: entry.itemGroupIds.length,
                    })}
                  </span>

                  {editable && (
                    <Button
                      className="ml-auto"
                      onClick={() => remove(entry.id)}
                      size="sm"
                      type="button"
                      variant="destructive"
                    >
                      {t("processApplicability.actions.remove")}
                    </Button>
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
