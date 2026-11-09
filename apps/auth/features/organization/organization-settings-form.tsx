"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@mqdms/ui/components/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@mqdms/ui/components/field";
import { Input } from "@mqdms/ui/components/input";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { uploadFile } from "@/features/storage/upload-file";

import { type OrganizationSettingsValues, organizationSettingsSchema } from "./schemas";

type OrganizationSettingsFormProps = {
  organization: {
    id: string;
    name: string;
    slug: string;
    logo?: string | null;
  };
};

export function OrganizationSettingsForm({ organization }: OrganizationSettingsFormProps) {
  const router = useRouter();

  const inputRef = useRef<HTMLInputElement>(null);

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(organization.logo ?? null);

  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const form = useForm<OrganizationSettingsValues>({
    resolver: zodResolver(organizationSettingsSchema),

    defaultValues: {
      name: organization.name,
      slug: organization.slug,
    },
  });

  useEffect(() => {
    if (!logoFile) {
      return;
    }

    const objectUrl = URL.createObjectURL(logoFile);

    setLogoPreview(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [logoFile]);

  async function onSubmit(values: OrganizationSettingsValues) {
    setServerError(null);
    setSuccess(false);

    try {
      let logoKey: string | undefined;

      if (logoFile) {
        const uploaded = await uploadFile({
          file: logoFile,
          purpose: "organization-logo",
        });

        logoKey = uploaded.key;
      }

      const response = await fetch("/api/organization", {
        method: "PATCH",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          ...values,
          ...(logoKey
            ? {
                logoKey,
              }
            : {}),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to update organization.");
      }

      setLogoFile(null);
      setSuccess(true);

      router.refresh();
    } catch (error) {
      setServerError(error instanceof Error ? error.message : "Unable to update organization.");
    }
  }

  return (
    <form className="space-y-8" onSubmit={form.handleSubmit(onSubmit)}>
      <FieldGroup>
        <Controller
          control={form.control}
          name="name"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Organization name</FieldLabel>

              <Input
                {...field}
                id={field.name}
                aria-invalid={fieldState.invalid}
                autoComplete="organization"
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
              <FieldLabel htmlFor={field.name}>Slug</FieldLabel>

              <Input
                {...field}
                id={field.name}
                aria-invalid={fieldState.invalid}
                autoCapitalize="none"
                autoComplete="off"
                spellCheck={false}
              />

              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Field>
          <FieldLabel>Organization logo</FieldLabel>

          <div className="flex items-center gap-4">
            <div className="relative size-16 overflow-hidden rounded-lg border bg-muted">
              {logoPreview ? (
                <Image
                  src={logoPreview}
                  alt={organization.name}
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="flex size-full items-center justify-center text-sm text-muted-foreground">
                  {organization.name.slice(0, 1).toUpperCase()}
                </div>
              )}
            </div>

            <div>
              <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];

                  if (!file) {
                    return;
                  }

                  setLogoFile(file);
                  setSuccess(false);
                }}
              />

              <Button type="button" variant="outline" onClick={() => inputRef.current?.click()}>
                Change logo
              </Button>

              <p className="mt-2 text-xs text-muted-foreground">JPG, PNG or WebP. Maximum 5 MB.</p>
            </div>
          </div>
        </Field>
      </FieldGroup>

      {serverError && <p className="text-sm text-destructive">{serverError}</p>}

      {success && <p className="text-sm text-muted-foreground">Organization settings updated.</p>}

      <Button type="submit" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? "Saving..." : "Save changes"}
      </Button>
    </form>
  );
}
