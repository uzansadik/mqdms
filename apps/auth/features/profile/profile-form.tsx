"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Avatar, AvatarFallback, AvatarImage } from "@mqdms/ui/components/avatar";
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
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { uploadFile } from "@/features/storage/upload-file";

import { updateProfileAction } from "./profile-actions";
import { type ProfileValues, profileSchema } from "./schemas";

type ProfileFormProps = {
  user: {
    name: string;
    email: string;
    image?: string | null;
  };
};

export function ProfileForm({ user }: ProfileFormProps) {
  const router = useRouter();

  const [previewUrl, setPreviewUrl] = useState<string | null>(user.image ?? null);

  const [saved, setSaved] = useState(false);

  const form = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user.name,
      avatar: undefined,
    },
  });

  const avatar = form.watch("avatar");

  useEffect(() => {
    if (!avatar) {
      setPreviewUrl(user.image ?? null);
      return;
    }

    const url = URL.createObjectURL(avatar);

    setPreviewUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [avatar, user.image]);

  async function onSubmit(values: ProfileValues) {
    form.clearErrors("root");
    setSaved(false);

    try {
      let avatarKey: string | undefined;

      if (values.avatar) {
        const uploaded = await uploadFile({
          file: values.avatar,
          purpose: "user-avatar",
        });

        avatarKey = uploaded.key;
      }

      const result = await updateProfileAction({
        name: values.name,
        avatarKey,
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      form.reset({
        name: values.name,
        avatar: undefined,
      });

      setSaved(true);

      router.refresh();
    } catch (error) {
      form.setError("root", {
        message: error instanceof Error ? error.message : "Unable to update profile.",
      });
    }
  }

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle>Profile</CardTitle>

        <CardDescription>Manage your personal information and profile image.</CardDescription>
      </CardHeader>

      <CardContent>
        <form noValidate onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup>
            {form.formState.errors.root && <FieldError errors={[form.formState.errors.root]} />}

            <div className="flex items-center gap-5">
              <Avatar className="size-20">
                {previewUrl && <AvatarImage alt={user.name} src={previewUrl} />}

                <AvatarFallback className="text-xl">
                  {user.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <Controller
                control={form.control}
                name="avatar"
                render={({ field, fieldState }) => (
                  <Field className="flex-1" data-invalid={fieldState.invalid}>
                    <FieldLabel>Profile image</FieldLabel>

                    <Input
                      accept="image/jpeg,image/png,image/webp"
                      aria-invalid={fieldState.invalid}
                      name={field.name}
                      onBlur={field.onBlur}
                      onChange={(event) => {
                        field.onChange(event.target.files?.[0]);
                      }}
                      ref={field.ref}
                      type="file"
                    />

                    <FieldDescription>JPEG, PNG or WebP. Maximum 5 MB.</FieldDescription>

                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            </div>

            <Controller
              control={form.control}
              name="name"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Name</FieldLabel>

                  <Input {...field} aria-invalid={fieldState.invalid} id={field.name} />

                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <Field>
              <FieldLabel>Email</FieldLabel>

              <Input disabled value={user.email} />

              <FieldDescription>Email changes will be handled separately.</FieldDescription>
            </Field>

            <div className="flex items-center gap-3">
              <Button disabled={form.formState.isSubmitting} type="submit">
                {form.formState.isSubmitting ? "Saving..." : "Save changes"}
              </Button>

              {saved && <p className="text-sm text-muted-foreground">Profile updated.</p>}
            </div>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
