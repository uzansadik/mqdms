"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { authClient } from "@mqdms/auth/client";
import { useI18n } from "@mqdms/i18n";
import { Button } from "@mqdms/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@mqdms/ui/components/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@mqdms/ui/components/field";
import { Input } from "@mqdms/ui/components/input";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";

import { registerWithInvitationAction } from "./invitation-registration";
import { type InvitationRegistrationValues, invitationRegistrationSchema } from "./schemas";

type InvitationRegistrationFormProps = {
  invitationId: string;
  organizationId: string;
  email: string;
  organizationName: string;
};

/**
 * Davet bağlantısıyla hesap açma.
 *
 * Genel kayıt kapalı olduğu için hesap yalnızca davet üzerinden açılır: e-posta
 * davetten gelir, parola burada belirlenir. Hesap açıldıktan sonra kullanıcı
 * giriş yapar ve daveti kabul eder.
 */
export function InvitationRegistrationForm({
  invitationId,
  organizationId,
  email,
  organizationName,
}: InvitationRegistrationFormProps) {
  const router = useRouter();
  const { t } = useI18n();

  const form = useForm<InvitationRegistrationValues>({
    resolver: zodResolver(invitationRegistrationSchema),
    defaultValues: {
      name: "",
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(values: InvitationRegistrationValues) {
    form.clearErrors("root");

    const result = await registerWithInvitationAction({
      invitationId,
      name: values.name,
      password: values.password,
    });

    if (!result.success) {
      form.setError("root", {
        message: result.error,
      });

      return;
    }

    const { error: signInError } = await authClient.signIn.email({
      email,
      password: values.password,
    });

    if (signInError) {
      form.setError("root", {
        message: signInError.message ?? t("organization.invitation.register.error"),
      });

      return;
    }

    const { error: acceptError } = await authClient.organization.acceptInvitation({
      invitationId,
    });

    if (acceptError) {
      form.setError("root", {
        message: acceptError.message ?? t("organization.invitation.register.error"),
      });

      return;
    }

    await authClient.organization.setActive({
      organizationId,
    });

    router.replace("/dashboard");
    router.refresh();
  }

  const loginParams = new URLSearchParams({
    next: `/accept-invitation?id=${encodeURIComponent(invitationId)}`,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("organization.invitation.register.title")}</CardTitle>

        <CardDescription>
          {t("organization.invitation.register.description", { organization: organizationName })}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form noValidate onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup>
            {form.formState.errors.root && <FieldError errors={[form.formState.errors.root]} />}

            <Field>
              <FieldLabel htmlFor="invitation-email">
                {t("organization.invitation.register.email")}
              </FieldLabel>

              <Input disabled id="invitation-email" readOnly type="email" value={email} />
            </Field>

            <Controller
              control={form.control}
              name="name"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>
                    {t("organization.invitation.register.name")}
                  </FieldLabel>

                  <Input
                    {...field}
                    aria-invalid={fieldState.invalid}
                    autoComplete="name"
                    id={field.name}
                  />

                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <Controller
              control={form.control}
              name="password"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>
                    {t("organization.invitation.register.password")}
                  </FieldLabel>

                  <Input
                    {...field}
                    aria-invalid={fieldState.invalid}
                    autoComplete="new-password"
                    id={field.name}
                    type="password"
                  />

                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <Controller
              control={form.control}
              name="confirmPassword"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>
                    {t("organization.invitation.register.confirmPassword")}
                  </FieldLabel>

                  <Input
                    {...field}
                    aria-invalid={fieldState.invalid}
                    autoComplete="new-password"
                    id={field.name}
                    type="password"
                  />

                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <Button disabled={form.formState.isSubmitting} type="submit">
              {form.formState.isSubmitting
                ? t("organization.invitation.register.submitting")
                : t("organization.invitation.register.submit")}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>

      <CardFooter className="justify-center">
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <span>{t("organization.invitation.register.hasAccount")}</span>

          <Button asChild size="sm" variant="link">
            <Link href={`/login?${loginParams.toString()}`}>
              {t("organization.invitation.register.signIn")}
            </Link>
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
