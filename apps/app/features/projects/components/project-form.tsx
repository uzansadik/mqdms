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
import { Controller, useForm, useWatch } from "react-hook-form";

import { createProjectAction, updateProjectAction } from "../actions";
import type { ProjectCreateValues, ProjectFormValues } from "../schema";
import { projectCreateSchema, projectFormSchema } from "../schema";

type ProjectFormProps = {
  mode: "create" | "edit";

  /** Müşteri seçim listesi. */
  customers: { id: string; code: string; name: string }[];

  /** Site seçim listesi; müşteriye göre filtrelenir. */
  sites: { id: string; customerId: string; name: string }[];

  /** Tesis seçim listesi. */
  plants: { id: string; code: string; name: string }[];

  /** Organizasyon üyeleri (proje müdürü seçimi). */
  members: { id: string; name: string; email: string }[];

  /** Düzenleme modunda proje kaydı. */
  project?: {
    id: string;
    customerId: string;
    customerSiteId: string | null;
    code: string;
    name: string;
    customerProjectCode: string | null;
    description: string | null;
    status: "DRAFT" | "ACTIVE" | "ON_HOLD" | "COMPLETED" | "CANCELLED";
    projectManagerMemberId: string | null;
    startDate: string | null;
    targetCompletionDate: string | null;
    actualCompletionDate: string | null;
  };
};

/**
 * Proje formu.
 *
 * Site seçimi müşteriye göre filtrelenir. `ACTIVE` durumunda bir proje için
 * en az bir tesis gerekir; bu kural sunucuda doğrulanır.
 */
export function ProjectForm({
  mode,
  customers,
  sites,
  plants,
  members,
  project,
}: ProjectFormProps) {
  const router = useRouter();
  const { t } = useI18n();

  const isEdit = mode === "edit";

  const form = useForm<ProjectCreateValues & ProjectFormValues>({
    resolver: zodResolver(isEdit ? projectFormSchema : projectCreateSchema),
    defaultValues: {
      customerId: project?.customerId ?? "",
      customerSiteId: project?.customerSiteId ?? "",
      code: project?.code ?? "",
      name: project?.name ?? "",
      customerProjectCode: project?.customerProjectCode ?? "",
      description: project?.description ?? "",
      status: project?.status ?? "DRAFT",
      projectManagerMemberId: project?.projectManagerMemberId ?? "",
      startDate: project?.startDate ?? "",
      targetCompletionDate: project?.targetCompletionDate ?? "",
      actualCompletionDate: project?.actualCompletionDate ?? "",
      primaryPlantId: "",
    },
  });

  const selectedCustomerId = useWatch({ control: form.control, name: "customerId" });

  const availableSites = selectedCustomerId
    ? sites.filter((site) => site.customerId === selectedCustomerId)
    : [];

  async function onSubmit(values: ProjectCreateValues & ProjectFormValues) {
    form.clearErrors("root");

    const result = project
      ? await updateProjectAction(project.id, values)
      : await createProjectAction(values);

    if (!result.success) {
      form.setError("root", { message: result.error });
      return;
    }

    if (project) {
      /*
       * Düzenleme sonrası form, **kaydedilen** değerlerle sıfırlanır.
       * `reset()` varsayılan değerlere döner ve bunlar eski kaydın değerleridir:
       * bir sonraki kayıt, yalnızca başka bir alanı değiştirdiğinde ilk
       * değişikliği geri alırdı.
       */
      form.reset(values);

      toast.success(t("projects.actions.updated"));

      router.refresh();
      return;
    }

    form.reset();

    toast.success(t("projects.actions.created"));

    router.push("/projects");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {isEdit ? t("projects.form.edit.title") : t("projects.form.create.title")}
        </CardTitle>

        <CardDescription>{t("projects.form.description")}</CardDescription>
      </CardHeader>

      <CardContent>
        <form noValidate onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup>
            {form.formState.errors.root && <FieldError errors={[form.formState.errors.root]} />}

            <Controller
              control={form.control}
              name="customerId"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>{t("projects.form.customer.label")}</FieldLabel>

                  <NativeSelect {...field} id={field.name}>
                    <NativeSelectOption value="">
                      {t("projects.form.customer.placeholder")}
                    </NativeSelectOption>

                    {customers.map((customer) => (
                      <NativeSelectOption key={customer.id} value={customer.id}>
                        {customer.code} · {customer.name}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>

                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <Controller
              control={form.control}
              name="customerSiteId"
              render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor={field.name}>
                    {t("projects.form.customerSite.label")}
                  </FieldLabel>

                  <NativeSelect {...field} id={field.name} disabled={!selectedCustomerId}>
                    <NativeSelectOption value="">
                      {t("projects.form.customerSite.none")}
                    </NativeSelectOption>

                    {availableSites.map((site) => (
                      <NativeSelectOption key={site.id} value={site.id}>
                        {site.name}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </Field>
              )}
            />

            <div className="grid gap-5 sm:grid-cols-2">
              <Controller
                control={form.control}
                name="code"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>{t("projects.form.code.label")}</FieldLabel>

                    <Input
                      {...field}
                      aria-invalid={fieldState.invalid}
                      id={field.name}
                      placeholder={t("projects.form.code.placeholder")}
                    />

                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <Controller
                control={form.control}
                name="customerProjectCode"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>
                      {t("projects.form.customerProjectCode.label")}
                    </FieldLabel>

                    <Input
                      {...field}
                      aria-invalid={fieldState.invalid}
                      id={field.name}
                      value={field.value ?? ""}
                    />

                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            </div>

            <Controller
              control={form.control}
              name="name"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>{t("projects.form.name.label")}</FieldLabel>

                  <Input
                    {...field}
                    aria-invalid={fieldState.invalid}
                    id={field.name}
                    placeholder={t("projects.form.name.placeholder")}
                  />

                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            {!isEdit && (
              <Controller
                control={form.control}
                name="primaryPlantId"
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor={field.name}>
                      {t("projects.plants.form.plant.label")}
                    </FieldLabel>

                    <NativeSelect {...field} id={field.name}>
                      <NativeSelectOption value="">
                        {t("projects.form.customerSite.none")}
                      </NativeSelectOption>

                      {plants.map((plant) => (
                        <NativeSelectOption key={plant.id} value={plant.id}>
                          {plant.code} · {plant.name}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </Field>
                )}
              />
            )}

            <Controller
              control={form.control}
              name="projectManagerMemberId"
              render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor={field.name}>{t("projects.form.manager.label")}</FieldLabel>

                  <NativeSelect {...field} id={field.name}>
                    <NativeSelectOption value="">
                      {t("projects.form.manager.none")}
                    </NativeSelectOption>

                    {members.map((member) => (
                      <NativeSelectOption key={member.id} value={member.id}>
                        {member.name} · {member.email}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </Field>
              )}
            />

            <div className="grid gap-5 sm:grid-cols-2">
              <Controller
                control={form.control}
                name="status"
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor={field.name}>{t("projects.form.status.label")}</FieldLabel>

                    <NativeSelect {...field} id={field.name}>
                      {(["DRAFT", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"] as const).map(
                        (status) => (
                          <NativeSelectOption key={status} value={status}>
                            {t(`projects.status.${status}`)}
                          </NativeSelectOption>
                        ),
                      )}
                    </NativeSelect>
                  </Field>
                )}
              />

              <Controller
                control={form.control}
                name="startDate"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>
                      {t("projects.form.startDate.label")}
                    </FieldLabel>

                    <Input
                      {...field}
                      aria-invalid={fieldState.invalid}
                      id={field.name}
                      type="date"
                      value={field.value ?? ""}
                    />

                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <Controller
                control={form.control}
                name="targetCompletionDate"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>
                      {t("projects.form.targetCompletionDate.label")}
                    </FieldLabel>

                    <Input
                      {...field}
                      aria-invalid={fieldState.invalid}
                      id={field.name}
                      type="date"
                      value={field.value ?? ""}
                    />

                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <Controller
                control={form.control}
                name="actualCompletionDate"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>
                      {t("projects.form.actualCompletionDate.label")}
                    </FieldLabel>

                    <Input
                      {...field}
                      aria-invalid={fieldState.invalid}
                      id={field.name}
                      type="date"
                      value={field.value ?? ""}
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
                    {t("projects.form.description.label")}
                  </FieldLabel>

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
                ? t("projects.form.submitting")
                : isEdit
                  ? t("projects.form.submit.update")
                  : t("projects.form.submit.create")}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
