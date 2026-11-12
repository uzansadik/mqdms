"use client";

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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@mqdms/ui/components/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@mqdms/ui/components/field";
import { Input } from "@mqdms/ui/components/input";
import { Textarea } from "@mqdms/ui/components/textarea";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { createRoleAction, deleteRoleAction, updateRoleAction } from "../actions";
import { RolePermissionEditor } from "./role-permission-editor";

type RoleRecord = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  permissions: {
    resource: string;
    action: string;
  }[];
};

type RoleManagerProps = {
  roles: RoleRecord[];
};

export function RoleManager({ roles }: RoleManagerProps) {
  const router = useRouter();
  const { t } = useI18n();

  const [error, setError] = useState<string | null>(null);

  async function remove(role: RoleRecord) {
    setError(null);

    const result = await deleteRoleAction({ roleId: role.id });

    if (!result.success) {
      setError(result.error);

      return;
    }

    router.refresh();
  }

  return (
    <div className="space-y-6">
      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{t("organization.roles.title")}</h2>

          <p className="text-sm text-muted-foreground">{t("organization.roles.description")}</p>
        </div>

        <RoleDialog mode="create" />
      </div>

      {roles.length === 0 ? (
        <div className="rounded-md border border-dashed p-6 text-center">
          <p className="text-sm font-medium">{t("organization.roles.empty.title")}</p>

          <p className="mt-1 text-sm text-muted-foreground">
            {t("organization.roles.empty.description")}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {roles.map((role) => (
            <Card key={role.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-base">{role.name}</CardTitle>

                    <CardDescription>{role.description ?? role.slug}</CardDescription>
                  </div>

                  <Badge variant="outline">{role.slug}</Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {t("organization.roles.permissionCount", {
                    count: role.permissions.length,
                  })}
                </p>

                <div className="flex gap-2">
                  <RoleDialog mode="edit" role={role} />

                  <Button
                    onClick={() => remove(role)}
                    size="icon"
                    variant="ghost"
                    aria-label={t("organization.roles.delete")}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

type RoleDialogProps = {
  mode: "create" | "edit";
  role?: RoleRecord;
};

function RoleDialog({ mode, role }: RoleDialogProps) {
  const router = useRouter();
  const { t } = useI18n();

  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [slug, setSlug] = useState(role?.slug ?? "");
  const [name, setName] = useState(role?.name ?? "");
  const [description, setDescription] = useState(role?.description ?? "");
  const [permissions, setPermissions] = useState<string[]>(
    role?.permissions.map((permission) => `${permission.resource}:${permission.action}`) ?? [],
  );

  async function submit() {
    setIsPending(true);
    setError(null);

    const result =
      mode === "create"
        ? await createRoleAction({ slug, name, description, permissions })
        : await updateRoleAction({
            roleId: role?.id ?? "",
            name,
            description: description.length > 0 ? description : null,
            permissions,
          });

    setIsPending(false);

    if (!result.success) {
      setError(result.error);

      return;
    }

    setOpen(false);

    router.refresh();
  }

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button size="sm" variant={mode === "create" ? "default" : "ghost"}>
          {mode === "create" ? (
            <>
              <Plus className="size-4" />
              {t("organization.roles.create")}
            </>
          ) : (
            <>
              <Pencil className="size-4" />
              {t("organization.roles.edit")}
            </>
          )}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? t("organization.roles.create") : t("organization.roles.edit")}
          </DialogTitle>

          <DialogDescription>{t("organization.roles.description")}</DialogDescription>
        </DialogHeader>

        <FieldGroup>
          {error && <FieldError errors={[{ message: error }]} />}

          {mode === "create" && (
            <Field>
              <FieldLabel htmlFor="role-slug">{t("organization.roles.slug")}</FieldLabel>

              <Input
                id="role-slug"
                onChange={(event) => setSlug(event.target.value)}
                placeholder="quality-inspector"
                value={slug}
              />
            </Field>
          )}

          <Field>
            <FieldLabel htmlFor="role-name">{t("organization.roles.name")}</FieldLabel>

            <Input id="role-name" onChange={(event) => setName(event.target.value)} value={name} />
          </Field>

          <Field>
            <FieldLabel htmlFor="role-description">
              {t("organization.roles.descriptionLabel")}
            </FieldLabel>

            <Textarea
              id="role-description"
              onChange={(event) => setDescription(event.target.value)}
              value={description}
            />
          </Field>

          <Field>
            <FieldLabel>{t("organization.roles.permissions")}</FieldLabel>

            <RolePermissionEditor
              disabled={isPending}
              onChange={setPermissions}
              selected={permissions}
            />
          </Field>
        </FieldGroup>

        <DialogFooter>
          <Button disabled={isPending} onClick={() => setOpen(false)} variant="outline">
            {t("common.cancel")}
          </Button>

          <Button disabled={isPending} onClick={submit}>
            {isPending ? t("organization.roles.saving") : t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
