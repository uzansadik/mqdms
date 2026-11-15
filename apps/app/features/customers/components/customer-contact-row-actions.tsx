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

import { archiveCustomerContactAction } from "../actions";
import { CustomerContactForm } from "./customer-contact-form";

type CustomerContactRowActionsProps = {
  customerId: string;
  sites: { id: string; name: string }[];
  contact: {
    id: string;
    customerSiteId: string | null;
    firstName: string;
    lastName: string;
    jobTitle: string | null;
    department: string | null;
    email: string | null;
    phone: string | null;
    notes: string | null;
    contactType: "QUALITY" | "PROJECT" | "PURCHASING" | "ENGINEERING" | "LOGISTICS" | "OTHER";
    status: "ACTIVE" | "INACTIVE";
  };
};

/**
 * Müşteri temsilcisi satır eylemleri.
 *
 * Temsilci fiziksel olarak silinmez: temsilci kaydı geçmişteki iletişim
 * bilgisini taşır.
 */
export function CustomerContactRowActions({
  customerId,
  sites,
  contact,
}: CustomerContactRowActionsProps) {
  const router = useRouter();
  const { t } = useI18n();
  const [isPending, startTransition] = useTransition();
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  function archive() {
    startTransition(async () => {
      const result = await archiveCustomerContactAction(contact.id);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success(t("customers.contacts.archived"));

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
            <span className="sr-only">{t("customers.contacts.actions")}</span>
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
            <DialogTitle>{t("customers.contacts.form.editTitle")}</DialogTitle>

            <DialogDescription>{t("customers.contacts.form.editDescription")}</DialogDescription>
          </DialogHeader>

          <CustomerContactForm
            contact={contact}
            customerId={customerId}
            sites={sites}
            surface="bare"
          />
        </DialogContent>
      </Dialog>

      <AlertDialog onOpenChange={setIsArchiveOpen} open={isArchiveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("customers.actions.archive")}</AlertDialogTitle>

            <AlertDialogDescription>
              {t("customers.contacts.archive.description")}
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
