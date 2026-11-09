"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { authClient } from "@mqdms/auth/client";
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
import { useRouter } from "next/navigation";
import { useRef } from "react";
import { Controller, useForm } from "react-hook-form";

import { type CreateOrganizationValues, createOrganizationSchema } from "./schemas";
import { createSlug } from "./utils";

export function CreateOrganizationForm() {
  const router = useRouter();
  const slugEdited = useRef(false);

  const form = useForm<CreateOrganizationValues>({
    resolver: zodResolver(createOrganizationSchema),
    defaultValues: {
      name: "",
      slug: "",
    },
  });

  async function onSubmit(values: CreateOrganizationValues) {
    form.clearErrors("root");

    const { error } = await authClient.organization.create({
      name: values.name,
      slug: values.slug,
      keepCurrentActiveOrganization: false,
    });

    if (error) {
      form.setError("root", {
        message: error.message ?? "Unable to create organization.",
      });

      return;
    }
    const { data: organizations } = await authClient.organization.list();
    const nextOrganization = organizations?.[0];

    if (nextOrganization) {
      await authClient.organization.setActive({
        organizationId: nextOrganization.id,
      });
    }
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create your workspace</CardTitle>

        <CardDescription>
          Your workspace contains your team, settings, files, and application data.
        </CardDescription>
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
                  <FieldLabel htmlFor={field.name}>Organization name</FieldLabel>

                  <Input
                    {...field}
                    aria-invalid={fieldState.invalid}
                    autoComplete="organization"
                    id={field.name}
                    placeholder="Acme Inc."
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
                  <FieldLabel htmlFor={field.name}>Workspace slug</FieldLabel>

                  <Input
                    {...field}
                    aria-invalid={fieldState.invalid}
                    autoCapitalize="none"
                    autoCorrect="off"
                    id={field.name}
                    placeholder="acme"
                    onChange={(event) => {
                      slugEdited.current = true;

                      field.onChange(createSlug(event.target.value));
                    }}
                  />

                  <FieldDescription>
                    Used as the unique identifier for this workspace.
                  </FieldDescription>

                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <Button disabled={form.formState.isSubmitting} type="submit">
              {form.formState.isSubmitting ? "Creating workspace..." : "Create workspace"}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
