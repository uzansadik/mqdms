"use client";

import { authClient } from "@mqdms/auth/client";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@mqdms/ui/components/dropdown-menu";
import { MoreHorizontal, ShieldCheck, UserRound, UserX } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type MemberActionsProps = {
  memberId: string;
  memberName: string;
  organizationId: string;
  role: string;
};

export function MemberActions({ memberId, memberName, organizationId, role }: MemberActionsProps) {
  const router = useRouter();

  const [isPending, setIsPending] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const roles = role.split(",");

  const isAdmin = roles.includes("admin");

  async function updateRole(nextRole: "admin" | "member") {
    setIsPending(true);
    setError(null);

    const { error } = await authClient.organization.updateMemberRole({
      memberId,
      organizationId,
      role: nextRole,
    });

    if (error) {
      setError(error.message ?? "Unable to update member role.");

      setIsPending(false);
      return;
    }

    router.refresh();
    setIsPending(false);
  }

  async function removeMember() {
    setIsPending(true);
    setError(null);

    const { error } = await authClient.organization.removeMember({
      memberIdOrEmail: memberId,
      organizationId,
    });

    if (error) {
      setError(error.message ?? "Unable to remove member.");

      setIsPending(false);
      return;
    }

    setRemoveOpen(false);

    router.refresh();
    setIsPending(false);
  }

  return (
    <>
      <div className="flex flex-col items-end gap-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button disabled={isPending} size="icon" variant="ghost">
              <MoreHorizontal className="size-4" />

              <span className="sr-only">Member actions</span>
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end">
            {isAdmin ? (
              <DropdownMenuItem onClick={() => updateRole("member")}>
                <UserRound />
                Make member
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={() => updateRole("admin")}>
                <ShieldCheck />
                Make admin
              </DropdownMenuItem>
            )}

            <DropdownMenuSeparator />

            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onSelect={() => setRemoveOpen(true)}
            >
              <UserX />
              Remove member
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {error && <p className="max-w-48 text-right text-xs text-destructive">{error}</p>}
      </div>

      <AlertDialog onOpenChange={setRemoveOpen} open={removeOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {memberName}?</AlertDialogTitle>

            <AlertDialogDescription>
              This member will lose access to the organization and its resources.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>

            <AlertDialogAction disabled={isPending} onClick={removeMember}>
              {isPending ? "Removing..." : "Remove member"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
