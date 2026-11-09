"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { assignableRoleIds } from "@mqdms/auth/permissions";
import { useI18n } from "@mqdms/i18n";
import { Button } from "@mqdms/ui/components/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@mqdms/ui/components/field";
import { Input } from "@mqdms/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@mqdms/ui/components/select";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";

import { inviteMemberAction } from "./actions";
import { type InviteMemberValues, inviteMemberSchema } from "./schemas";

type InviteMemberFormProps = {
  organizationId: string;
};

export function InviteMemberForm({ organizationId }: InviteMemberFormProps) {
  const router = useRouter();
  const { t } = useI18n();

  const form = useForm<InviteMemberValues>({
    resolver: zodResolver(inviteMemberSchema),
    defaultValues: {
      email: "",
      role: "member",
    },
  });

  async function onSubmit(values: InviteMemberValues) {
    form.clearErrors("root");

    const result = await inviteMemberAction({
      organizationId,
      email: values.email,
      role: values.role,
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

        <div className="grid gap-4 md:grid-cols-[1fr_180px_auto]">
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
            name="role"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>{t("organization.members.invite.role")}</FieldLabel>

                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger aria-invalid={fieldState.invalid}>
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    {assignableRoleIds.map((roleId) => (
                      <SelectItem key={roleId} value={roleId}>
                        {t(`roles.${roleId}.label`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

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
        </div>
      </FieldGroup>
    </form>
  );
}
