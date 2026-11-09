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
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@mqdms/ui/components/field";
import { Input } from "@mqdms/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@mqdms/ui/components/select";
import { useRouter } from "next/navigation";
import { useRef } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { createSlug } from "@/features/organization/utils";

import { createOrganizationAction } from "../actions";
import { type CreateOrganizationByAdminValues, createOrganizationByAdminSchema } from "../schemas";

export function CreateOrganizationForm() {
  const router = useRouter();
  const { t } = useI18n();
  const slugEdited = useRef(false);

  const form = useForm<CreateOrganizationByAdminValues>({
    resolver: zodResolver(createOrganizationByAdminSchema),
    defaultValues: {
      name: "",
      slug: "",
      owner: {
        email: "",
        name: undefined,
        role: "owner",
      },
    },
  });

  async function onSubmit(values: CreateOrganizationByAdminValues) {
    form.clearErrors("root");

    try {
      const result = await createOrganizationAction(values);

      if (!result.success) {
        form.setError("root", {
          message: result.error,
        });

        /*
         * Hata mesajı formun üst kısmında görünür; kullanıcı butona
         * baktığında aksiyon almadığını düşünebilir. Toast her durumda
         * görünür kaldığı için hata da bildirim olarak gösterilir.
         */
        toast.error(result.error);

        return;
      }

      toast.success(t("admin.organizationForm.success"));

      router.push("/admin/organizations");
      router.refresh();
    } catch (error) {
      console.error("Failed to create the organization:", error);

      const message = t("admin.organizationForm.error");

      form.setError("root", {
        message,
      });

      toast.error(message);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("admin.organizationForm.title")}</CardTitle>

        <CardDescription>{t("admin.organizationForm.description")}</CardDescription>
      </CardHeader>

      <CardContent>
        <form noValidate onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup>
            {form.formState.errors.root && <FieldError errors={[form.formState.errors.root]} />}

            <Controller
              control={form.control}
              name="name"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>{t("admin.organizationForm.name")}</FieldLabel>

                  <Input
                    {...field}
                    aria-invalid={fieldState.invalid}
                    id={field.name}
                    placeholder={t("admin.organizationForm.namePlaceholder")}
                    onChange={(event) => {
                      field.onChange(event);

                      if (!slugEdited.current) {
                        form.setValue("slug", createSlug(event.target.value), {
                          shouldValidate: false,
                        });
                      }
                    }}
                  />

                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <Controller
              control={form.control}
              name="slug"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>{t("admin.organizationForm.slug")}</FieldLabel>

                  <Input
                    {...field}
                    aria-invalid={fieldState.invalid}
                    autoCapitalize="none"
                    autoCorrect="off"
                    id={field.name}
                    placeholder={t("admin.organizationForm.slugPlaceholder")}
                    onChange={(event) => {
                      slugEdited.current = true;

                      field.onChange(createSlug(event.target.value));
                    }}
                  />

                  <FieldDescription>{t("admin.organizationForm.slugDescription")}</FieldDescription>

                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <div className="grid gap-4 md:grid-cols-2">
              <Controller
                control={form.control}
                name="owner.email"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>
                      {t("admin.organizationForm.ownerEmail")}
                    </FieldLabel>

                    <Input
                      {...field}
                      aria-invalid={fieldState.invalid}
                      autoComplete="off"
                      id={field.name}
                      placeholder={t("admin.organizationForm.ownerEmailPlaceholder")}
                      type="email"
                    />

                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <Controller
                control={form.control}
                name="owner.name"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>
                      {t("admin.organizationForm.ownerName")}
                    </FieldLabel>

                    <Input
                      {...field}
                      aria-invalid={fieldState.invalid}
                      id={field.name}
                      placeholder={t("admin.organizationForm.ownerNamePlaceholder")}
                    />

                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            </div>

            <Controller
              control={form.control}
              name="owner.role"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>{t("admin.organizationForm.ownerRole")}</FieldLabel>

                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger aria-invalid={fieldState.invalid}>
                      <SelectValue />
                    </SelectTrigger>

                    <SelectContent>
                      <SelectItem value="owner">{t("roles.owner.label")}</SelectItem>
                      <SelectItem value="admin">{t("roles.admin.label")}</SelectItem>
                    </SelectContent>
                  </Select>

                  <FieldDescription>
                    {t("admin.organizationForm.ownerRoleDescription")}
                  </FieldDescription>

                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <Button disabled={form.formState.isSubmitting} type="submit">
              {form.formState.isSubmitting
                ? t("admin.organizationForm.submitting")
                : t("admin.organizationForm.submit")}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
