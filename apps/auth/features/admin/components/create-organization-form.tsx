"use client";

import { zodResolver } from "@hookform/resolvers/zod";
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

import { createSlug } from "@/features/organization/utils";

import { createOrganizationAction } from "../actions";
import { type CreateOrganizationByAdminValues, createOrganizationByAdminSchema } from "../schemas";

export function CreateOrganizationForm() {
  const router = useRouter();
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

    const result = await createOrganizationAction(values);

    if (!result.success) {
      form.setError("root", {
        message: result.error,
      });

      return;
    }

    router.push(`/admin/organizations/${result.data.organizationId}`);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create an organization</CardTitle>

        <CardDescription>
          The organization owner receives an email to set their password. Superadmin stays outside
          the organization and manages it from this panel.
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
                    Used as the unique identifier of this workspace.
                  </FieldDescription>

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
                    <FieldLabel htmlFor={field.name}>Owner email</FieldLabel>

                    <Input
                      {...field}
                      aria-invalid={fieldState.invalid}
                      autoComplete="off"
                      id={field.name}
                      placeholder="owner@example.com"
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
                    <FieldLabel htmlFor={field.name}>Owner name</FieldLabel>

                    <Input
                      {...field}
                      aria-invalid={fieldState.invalid}
                      id={field.name}
                      placeholder="Full name"
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
                  <FieldLabel>Owner role</FieldLabel>

                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger aria-invalid={fieldState.invalid}>
                      <SelectValue />
                    </SelectTrigger>

                    <SelectContent>
                      <SelectItem value="owner">Owner</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>

                  <FieldDescription>
                    The owner manages members and permissions of this organization.
                  </FieldDescription>

                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <Button disabled={form.formState.isSubmitting} type="submit">
              {form.formState.isSubmitting ? "Creating..." : "Create organization"}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
