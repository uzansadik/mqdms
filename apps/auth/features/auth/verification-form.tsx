"use client";

import { authClient } from "@mqdms/auth/client";
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
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";

import { type VerificationValues, verificationSchema } from "./schemas";

type VerificationFormProps = {
  email: string;
  next: string;
};

export function VerificationForm({ email, next }: VerificationFormProps) {
  const form = useForm<VerificationValues>({
    resolver: zodResolver(verificationSchema),
    defaultValues: {
      email,
    },
  });

  async function onSubmit(values: VerificationValues) {
    form.clearErrors("root");

    const { error } = await authClient.sendVerificationEmail({
      email: values.email,
      callbackURL: next,
    });

    if (error) {
      form.setError("root", {
        message: error.message ?? "Unable to send verification email.",
      });

      return;
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Verify your email</CardTitle>

        <CardDescription>
          Check your inbox for the verification link. You can resend it below.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <FieldGroup>
            {form.formState.errors.root && <FieldError errors={[form.formState.errors.root]} />}

            {form.formState.isSubmitSuccessful && (
              <p className="text-sm text-muted-foreground">Verification email sent.</p>
            )}

            <Controller
              control={form.control}
              name="email"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Email</FieldLabel>

                  <Input
                    {...field}
                    id={field.name}
                    type="email"
                    autoComplete="email"
                    aria-invalid={fieldState.invalid}
                  />

                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Sending..." : "Resend verification email"}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
