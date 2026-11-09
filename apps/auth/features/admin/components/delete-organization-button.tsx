"use client";

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
import { useState } from "react";

import { deleteOrganizationAction } from "../actions";

type DeleteOrganizationButtonProps = {
  organizationId: string;
  name: string;
};

export function DeleteOrganizationButton({ organizationId, name }: DeleteOrganizationButtonProps) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setPending(true);
    setError(null);

    const result = await deleteOrganizationAction(organizationId);

    if (!result.success) {
      setError(result.error);
      setPending(false);

      return;
    }

    setOpen(false);
    setPending(false);

    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <AlertDialog onOpenChange={setOpen} open={open}>
        <AlertDialogTrigger asChild>
          <Button aria-label={`Delete ${name}`} size="icon" variant="ghost">
            <Trash2 className="size-4" />
          </Button>
        </AlertDialogTrigger>

        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {name}?</AlertDialogTitle>

            <AlertDialogDescription>
              This removes the organization together with its members, invitations and permission
              grants. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>

            <AlertDialogAction disabled={pending} onClick={handleDelete}>
              {pending ? "Deleting..." : "Delete organization"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {error && <p className="max-w-48 text-right text-xs text-destructive">{error}</p>}
    </div>
  );
}
