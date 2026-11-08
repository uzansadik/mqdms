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

import { type RegisterValues, registerSchema } from "./schemas";

type RegisterFormProps = {
  next: string;
};

export function RegisterForm({ next }: RegisterFormProps) {
  const router = useRouter();
  const { t } = useI18n();

  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(values: RegisterValues) {
    form.clearErrors("root");

    const { error } = await authClient.signUp.email({
      name: values.name,
      email: values.email,
      password: values.password,
      callbackURL: next,
    });

    if (error) {
      form.setError("root", {
        message: error.message ?? t("auth.register.error"),
      });

      return;
    }

    const params = new URLSearchParams({
      email: values.email,
      next,
    });

    router.push(`/verify-email?${params.toString()}`);
  }

  const loginParams = new URLSearchParams({
    next,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("auth.register.title")}</CardTitle>

        <CardDescription>{t("auth.register.description")}</CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <FieldGroup>
            {form.formState.errors.root && <FieldError errors={[form.formState.errors.root]} />}

            <Controller
              control={form.control}
              name="name"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>{t("auth.register.name")}</FieldLabel>

                  <Input
                    {...field}
                    id={field.name}
                    autoComplete="name"
                    aria-invalid={fieldState.invalid}
                  />

                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <Controller
              control={form.control}
              name="email"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>{t("auth.register.email")}</FieldLabel>

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
                  <FieldLabel htmlFor={field.name}>{t("auth.register.password")}</FieldLabel>

                  <Input
                    {...field}
                    id={field.name}
                    type="password"
                    autoComplete="new-password"
                    aria-invalid={fieldState.invalid}
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
                  <FieldLabel htmlFor={field.name}>{t("auth.register.confirmPassword")}</FieldLabel>

                  <Input
                    {...field}
                    id={field.name}
                    type="password"
                    autoComplete="new-password"
                    aria-invalid={fieldState.invalid}
                  />

                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting
                ? t("auth.register.submitting")
                : t("auth.register.submit")}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>

      <CardFooter className="justify-center">
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <span>{t("auth.register.hasAccount")}</span>

          <Button asChild variant="link" size="sm">
            <Link href={`/login?${loginParams.toString()}`}>{t("auth.login.title")}</Link>
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
