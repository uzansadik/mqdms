"use client";

import { useI18n } from "@mqdms/i18n";
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
import { Textarea } from "@mqdms/ui/components/textarea";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { createItemRevisionAction } from "../actions";

type ItemRevisionFormProps = {
  /** Item; sunucudan gelir. */
  itemId: string;
};

/**
 * Item revision oluşturma formu.
 *
 * Revision teknik içerik olarak `DRAFT` başlar; yayınlandıktan sonra
 * değiştirilemez ve yeni bir teknik değişiklik yeni bir revision gerektirir.
 */
export function ItemRevisionForm({ itemId }: ItemRevisionFormProps) {
  const router = useRouter();
  const { t } = useI18n();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit(formData: FormData) {
    setError(null);

    startTransition(async () => {
      const result = await createItemRevisionAction({
        itemId,
        revision: formData.get("revision"),
        description: formData.get("description"),
        changeReason: formData.get("changeReason"),
        effectiveFrom: formData.get("effectiveFrom"),
      });

      if (!result.success) {
        setError(result.error);
        toast.error(result.error);
        return;
      }

      toast.success(t("items.revisions.actions.created"));

      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("items.revisions.form.title")}</CardTitle>

        <CardDescription>{t("items.revisions.form.description")}</CardDescription>
      </CardHeader>

      <CardContent>
        <form action={submit}>
          <FieldGroup>
            {error && <FieldError errors={[{ message: error }]} />}

            <div className="grid gap-5 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="revision">
                  {t("items.revisions.form.revision.label")}
                </FieldLabel>

                <Input
                  id="revision"
                  name="revision"
                  placeholder={t("items.revisions.form.revision.placeholder")}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="effectiveFrom">
                  {t("items.revisions.form.effectiveFrom.label")}
                </FieldLabel>

                <Input id="effectiveFrom" name="effectiveFrom" type="date" />
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="changeReason">
                {t("items.revisions.form.changeReason.label")}
              </FieldLabel>

              <Input id="changeReason" name="changeReason" />
            </Field>

            <Field>
              <FieldLabel htmlFor="description">
                {t("items.revisions.form.description.label")}
              </FieldLabel>

              <Textarea id="description" name="description" rows={2} />
            </Field>

            <Button disabled={isPending} type="submit">
              {isPending ? t("items.form.submitting") : t("items.revisions.form.submit")}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
