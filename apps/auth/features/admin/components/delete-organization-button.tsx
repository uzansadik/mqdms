"use client";

import { useI18n } from "@mqdms/i18n";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@mqdms/ui/components/alert-dialog";
import { Button } from "@mqdms/ui/components/button";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { type MouseEvent, useState } from "react";

import { deleteOrganizationAction } from "../actions";

type DeleteOrganizationButtonProps = {
  organizationId: string;
  name: string;
};

export function DeleteOrganizationButton({ organizationId, name }: DeleteOrganizationButtonProps) {
  const router = useRouter();
  const { t } = useI18n();

  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete(event: MouseEvent<HTMLButtonElement>) {
    // Radix, butona tıklandığında dialog'u kendisi kapatır; aksi halde silme
    // bitmeden pencere kapanır ve kullanıcı ikinci bir silme başlatabilir.
    event.preventDefault();

    setPending(true);
    setError(null);

    try {
      const result = await deleteOrganizationAction(organizationId);

      if (!result.success) {
        setError(result.error);

        return;
      }

      setOpen(false);

      router.refresh();
    } catch {
      setError(t("admin.organization.delete.failed"));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <AlertDialog onOpenChange={setOpen} open={open}>
        <AlertDialogTrigger asChild>
          <Button
            aria-label={t("admin.organization.delete.aria", { name })}
            size="icon"
            variant="ghost"
          >
            <Trash2 className="size-4" />
          </Button>
        </AlertDialogTrigger>

        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("admin.organization.delete.title", { name })}</AlertDialogTitle>

            <AlertDialogDescription>
              {t("admin.organization.delete.description")}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>{t("common.cancel")}</AlertDialogCancel>

            <AlertDialogAction disabled={pending} onClick={handleDelete}>
              {pending
                ? t("admin.organization.delete.deleting")
                : t("admin.organization.delete.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {error && <p className="max-w-48 text-right text-xs text-destructive">{error}</p>}
    </div>
  );
}
