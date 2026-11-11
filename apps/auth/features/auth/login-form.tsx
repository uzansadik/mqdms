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

import { type LoginValues, loginSchema } from "./schemas";

type LoginFormProps = {
  next: string;

  /**
   * Sayfa, OAuth provider akışının parçası mı?
   *
   * Akışta better-auth sunucusu bir sonraki adımın adresini döner
   * (organizasyon seçimi ya da onay ekranı) ve istemci o adrese yönlendirir.
   */
  isOAuthFlow?: boolean;
};

export function LoginForm({ next, isOAuthFlow = false }: LoginFormProps) {
  const router = useRouter();
  const { t } = useI18n();

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: LoginValues) {
    form.clearErrors("root");

    const { data, error } = await authClient.signIn.email({
      email: values.email,
      password: values.password,
      /*
       * OAuth akışında `callbackURL` verilmez: sunucu akışın bir sonraki
       * adımını (organizasyon seçimi ya da onay ekranı) döner.
       */
      ...(isOAuthFlow ? {} : { callbackURL: next }),
    });

    if (error) {
      if (error.status === 403) {
        const params = new URLSearchParams({
          email: values.email,
          next,
        });

        router.push(`/verify-email?${params.toString()}`);

        return;
      }

      form.setError("root", {
        message: error.message ?? t("auth.login.error"),
      });

      return;
    }

    if (isOAuthFlow) {
      /*
       * OAuth akışı devam ediyor. Organizasyon seçimi kullanıcıya bırakıldığı
       * için aktif organizasyon burada değiştirilmez.
       */
      if (data?.redirect && data?.url) {
        window.location.href = data.url;
      }

      return;
    }

    const organizations = await authClient.organization.list();
    if (organizations.data?.length) {
      await authClient.organization.setActive({
        organizationId: organizations.data[0]?.id,
      });
    }

    /*
     * Superadmin organizasyon üyesi olmayabilir; dashboard yerine platform
     * paneline yönlendirilir.
     */
    const { data: sessionData } = await authClient.getSession({
      fetchOptions: {
        cache: "no-store",
      },
    });

    const isSuperadmin = sessionData?.user?.role === "superadmin";

    router.replace(isSuperadmin ? "/admin" : next);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("auth.login.title")}</CardTitle>
        <CardDescription>{t("auth.login.description")}</CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <FieldGroup>
            {form.formState.errors.root && <FieldError errors={[form.formState.errors.root]} />}

            <Controller
              control={form.control}
              name="email"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>{t("auth.login.email")}</FieldLabel>

                  <Input
                    {...field}
                    id={field.name}
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    aria-invalid={fieldState.invalid}
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
                  <div className="flex items-center justify-between">
                    <FieldLabel htmlFor={field.name}>{t("auth.login.password")}</FieldLabel>

                    <Button asChild variant="link" size="sm">
                      <Link href="/forgot-password">{t("auth.login.forgotPassword")}</Link>
                    </Button>
                  </div>

                  <Input
                    {...field}
                    id={field.name}
                    type="password"
                    autoComplete="current-password"
                    aria-invalid={fieldState.invalid}
                  />

                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? t("auth.login.submitting") : t("auth.login.submit")}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>

      <CardFooter className="justify-center">
        <p className="text-center text-sm text-muted-foreground">
          {t("auth.login.invitationOnly")}
        </p>
      </CardFooter>
    </Card>
  );
}
