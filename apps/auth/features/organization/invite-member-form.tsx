"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useI18n } from "@mqdms/i18n";
import { Button } from "@mqdms/ui/components/button";
import { Checkbox } from "@mqdms/ui/components/checkbox";
import { Field, FieldError, FieldGroup, FieldLabel } from "@mqdms/ui/components/field";
import { Input } from "@mqdms/ui/components/input";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";

import { inviteMemberAction } from "./actions";
import { type InviteMemberValues, inviteMemberSchema } from "./schemas";

type InviteMemberFormProps = {
  organizationId: string;

  /** Organizasyondaki fonksiyonel roller. */
  roles: {
    id: string;
    name: string;
    description: string | null;
  }[];
};

export function InviteMemberForm({ organizationId, roles }: InviteMemberFormProps) {
  const router = useRouter();
  const { t } = useI18n();

  const form = useForm<InviteMemberValues>({
    resolver: zodResolver(inviteMemberSchema),
    defaultValues: {
      email: "",
      roleIds: [],
    },
  });

  async function onSubmit(values: InviteMemberValues) {
    form.clearErrors("root");

    const result = await inviteMemberAction({
      organizationId,
      email: values.email,
      roleIds: values.roleIds,
    });

    if (!result.success) {
      form.setError("root", {
        message: result.error,
      });

      return;
    }

    form.reset();

    router.refresh();
  }

  return (
    <form noValidate onSubmit={form.handleSubmit(onSubmit)}>
      <FieldGroup>
        {form.formState.errors.root && <FieldError errors={[form.formState.errors.root]} />}

        <Controller
          control={form.control}
          name="email"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>
                {t("organization.members.invite.email")}
              </FieldLabel>

              <Input
                {...field}
                aria-invalid={fieldState.invalid}
                id={field.name}
                placeholder={t("organization.members.invite.emailPlaceholder")}
                type="email"
              />

              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          control={form.control}
          name="roleIds"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel>{t("organization.members.invite.role")}</FieldLabel>

              {roles.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t("organization.roles.empty.description")}
                </p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {roles.map((role) => {
                    const checked = field.value.includes(role.id);

                    return (
                      <div
                        className="flex items-start gap-2 rounded-md border p-3 text-sm"
                        key={role.id}
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(value) => {
                            field.onChange(
                              value === true
                                ? [...field.value, role.id]
                                : field.value.filter((item) => item !== role.id),
                            );
                          }}
                        />

                        <span className="min-w-0">
                          <span className="block font-medium">{role.name}</span>

                          {role.description && (
                            <span className="block text-muted-foreground">
                              {role.description}
                            </span>
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <div className="flex items-end">
          <Button disabled={form.formState.isSubmitting} type="submit">
            {form.formState.isSubmitting
              ? t("organization.members.invite.submitting")
              : t("organization.members.invite.submit")}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
