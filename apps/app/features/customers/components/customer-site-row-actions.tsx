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
} from "@mqdms/ui/components/alert-dialog";
import { Button } from "@mqdms/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@mqdms/ui/components/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@mqdms/ui/components/dropdown-menu";
import { MoreHorizontal, Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { archiveCustomerSiteAction } from "../actions";
import { CustomerSiteForm } from "./customer-site-form";

type CustomerSiteRowActionsProps = {
  customerId: string;
  site: {
    id: string;
    code: string;
    name: string;
    countryCode: string | null;
    city: string | null;
    address: string | null;
    postalCode: string | null;
    description: string | null;
    status: "ACTIVE" | "INACTIVE";
  };
};

/**
 * Müşteri sitesi satır eylemleri.
 *
 * Düzenleme diyalogda yapılır; arşivleme onay ister. Site fiziksel olarak
 * silinmez: sitee bağlı projeler vardır.
 */
export function CustomerSiteRowActions({ customerId, site }: CustomerSiteRowActionsProps) {
  const router = useRouter();
  const { t } = useI18n();
  const [isPending, startTransition] = useTransition();
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  function archive() {
    startTransition(async () => {
      const result = await archiveCustomerSiteAction(site.id);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success(t("customers.sites.archived"));

      setIsArchiveOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon-sm" variant="ghost">
            <MoreHorizontal aria-hidden="true" />
            <span className="sr-only">{t("customers.sites.actions")}</span>
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setIsEditOpen(true)}>
            <Pencil />

            {t("customers.actions.edit")}
          </DropdownMenuItem>

          <DropdownMenuItem
            disabled={isPending}
            onSelect={() => setIsArchiveOpen(true)}
            variant="destructive"
          >
            {t("customers.actions.archive")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog onOpenChange={setIsEditOpen} open={isEditOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("customers.sites.form.editTitle")}</DialogTitle>

            <DialogDescription>{t("customers.sites.form.editDescription")}</DialogDescription>
          </DialogHeader>

          <CustomerSiteForm customerId={customerId} site={site} surface="bare" />
        </DialogContent>
      </Dialog>

      <AlertDialog onOpenChange={setIsArchiveOpen} open={isArchiveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("customers.actions.archive")}</AlertDialogTitle>

            <AlertDialogDescription>
              {t("customers.sites.archive.description")}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>

            <AlertDialogAction disabled={isPending} onClick={archive}>
              {t("customers.actions.archive")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
