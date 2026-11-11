"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useI18n } from "@mqdms/i18n";
import { Badge } from "@mqdms/ui/components/badge";
import { Button } from "@mqdms/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@mqdms/ui/components/card";
import { Checkbox } from "@mqdms/ui/components/checkbox";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@mqdms/ui/components/field";
import { Input } from "@mqdms/ui/components/input";
import { Textarea } from "@mqdms/ui/components/textarea";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { type CreateOAuthClientValues, createOAuthClientSchema } from "@/features/oauth/schemas";

import { createOAuthClientAction, deleteOAuthClientAction } from "./actions";
import type { OAuthClientSummary } from "./server";

type CreatedClient = {
  clientId: string;
  clientSecret?: string;
};

/**
 * Kayıtlı tüketen uygulamaların yönetimi.
 *
 * Client secret yalnızca oluşturma anında gösterilir; sonrasında hash'li
 * olarak saklanır ve tekrar görülemez.
 */
export function OAuthClientsSection({ clients }: { clients: OAuthClientSummary[] }) {
  const router = useRouter();
  const { t } = useI18n();
  const [created, setCreated] = useState<CreatedClient | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const form = useForm<CreateOAuthClientValues>({
    resolver: zodResolver(createOAuthClientSchema),
    defaultValues: {
      clientName: "",
      redirectUris: "",
      resources: "",
      scope: "",
      publicClient: false,
    },
  });

  async function onSubmit(values: CreateOAuthClientValues) {
    form.clearErrors("root");

    try {
      const result = await createOAuthClientAction(values);

      if (!result.success) {
        form.setError("root", { message: result.error });
        toast.error(result.error);

        return;
      }

      setCreated(result.data);
      form.reset();

      toast.success(t("admin.oauthClients.created"));
      router.refresh();
    } catch (error) {
      console.error("Failed to create the OAuth client:", error);

      const message = t("admin.oauthClients.createError");

      form.setError("root", { message });
      toast.error(message);
    }
  }

  async function remove(clientId: string) {
    setDeletingId(clientId);

    try {
      const result = await deleteOAuthClientAction(clientId);

      if (!result.success) {
        toast.error(result.error);

        return;
      }

      toast.success(t("admin.oauthClients.deleted"));
      router.refresh();
    } catch (error) {
      console.error("Failed to delete the OAuth client:", error);

      toast.error(t("admin.oauthClients.deleteError"));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("admin.oauthClients.title")}</CardTitle>
          <CardDescription>{t("admin.oauthClients.description")}</CardDescription>
        </CardHeader>

        <CardContent>
          <form noValidate onSubmit={form.handleSubmit(onSubmit)}>
            <FieldGroup>
              {form.formState.errors.root && <FieldError errors={[form.formState.errors.root]} />}

              <Controller
                control={form.control}
                name="clientName"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>
                      {t("admin.oauthClients.clientName")}
                    </FieldLabel>

                    <Input
                      {...field}
                      aria-invalid={fieldState.invalid}
                      id={field.name}
                      placeholder="Example App"
                    />

                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <Controller
                control={form.control}
                name="redirectUris"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>
                      {t("admin.oauthClients.redirectUris")}
                    </FieldLabel>

                    <Textarea
                      {...field}
                      aria-invalid={fieldState.invalid}
                      className="font-mono text-xs"
                      id={field.name}
                      placeholder="https://app.example.com/callback"
                      rows={3}
                    />

                    <FieldDescription>
                      {t("admin.oauthClients.redirectUrisDescription")}
                    </FieldDescription>

                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <Controller
                control={form.control}
                name="resources"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>
                      {t("admin.oauthClients.resources")}
                    </FieldLabel>

                    <Textarea
                      {...field}
                      aria-invalid={fieldState.invalid}
                      className="font-mono text-xs"
                      id={field.name}
                      placeholder="https://api.example.com"
                      rows={2}
                    />

                    <FieldDescription>
                      {t("admin.oauthClients.resourcesDescription")}
                    </FieldDescription>

                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <Controller
                control={form.control}
                name="scope"
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor={field.name}>{t("admin.oauthClients.scope")}</FieldLabel>

                    <Input
                      {...field}
                      className="font-mono text-xs"
                      id={field.name}
                      placeholder="openid profile email offline_access permissions:read"
                    />

                    <FieldDescription>{t("admin.oauthClients.scopeDescription")}</FieldDescription>
                  </Field>
                )}
              />

              <Controller
                control={form.control}
                name="publicClient"
                render={({ field }) => (
                  <Field orientation="horizontal">
                    <Checkbox
                      checked={field.value ?? false}
                      id={field.name}
                      onCheckedChange={(checked) => field.onChange(checked === true)}
                    />

                    <FieldLabel htmlFor={field.name}>
                      {t("admin.oauthClients.publicClient")}
                    </FieldLabel>

                    <FieldDescription>
                      {t("admin.oauthClients.publicClientDescription")}
                    </FieldDescription>
                  </Field>
                )}
              />

              <Button disabled={form.formState.isSubmitting} type="submit">
                {form.formState.isSubmitting
                  ? t("admin.oauthClients.creating")
                  : t("admin.oauthClients.create")}
              </Button>
            </FieldGroup>
          </form>

          {created && (
            <div className="mt-6 rounded-md border border-border bg-muted/40 p-4 font-mono text-xs">
              <p className="mb-2 font-sans text-sm font-medium">
                {t("admin.oauthClients.createdDetails")}
              </p>

              <p className="break-all">
                <span className="text-muted-foreground">client_id: </span>
                {created.clientId}
              </p>

              {created.clientSecret && (
                <p className="break-all">
                  <span className="text-muted-foreground">client_secret: </span>
                  {created.clientSecret}
                </p>
              )}

              <p className="mt-2 font-sans text-xs text-muted-foreground">
                {t("admin.oauthClients.secretNotice")}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("admin.oauthClients.listTitle")}</CardTitle>
        </CardHeader>

        <CardContent>
          {clients.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("admin.oauthClients.empty")}</p>
          ) : (
            <ul className="space-y-3">
              {clients.map((client) => (
                <li
                  key={client.clientId}
                  className="flex flex-wrap items-start justify-between gap-3 rounded-md border border-border p-3"
                >
                  <div className="min-w-0 space-y-1">
                    <p className="font-medium">{client.name ?? client.clientId}</p>

                    <p className="break-all font-mono text-xs text-muted-foreground">
                      {client.clientId}
                    </p>

                    <p className="text-xs text-muted-foreground">
                      {client.redirectUris.join(", ")}
                    </p>

                    {client.resources.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {client.resources.map((resource) => (
                          <Badge key={resource} variant="secondary">
                            {resource}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  <Button
                    disabled={deletingId === client.clientId}
                    onClick={() => remove(client.clientId)}
                    size="sm"
                    variant="outline"
                  >
                    {t("admin.oauthClients.delete")}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
