"use client";

import { zodResolver } from "@hookform/resolvers/zod";
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
import { NativeSelect, NativeSelectOption } from "@mqdms/ui/components/native-select";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { addProjectMemberAction } from "../actions";
import type { ProjectMemberFormValues } from "../schema";
import { projectMemberFormSchema } from "../schema";

type ProjectTeamFormProps = {
  projectId: string;

  /** Projeye eklenebilecek organizasyon üyeleri. */
  members: { id: string; name: string; email: string }[];

  /** Projede zaten bulunan üye id'leri. */
  existingMemberIds: string[];
};

/**
 * Proje ekibine üye ekleme formu.
 *
 * Proje rolü merkezi kimlik doğrulama permission rolünden bağımsızdır: ekip
 * üyesi olmak yeni bir auth permission vermez.
 */
export function ProjectTeamForm({ projectId, members, existingMemberIds }: ProjectTeamFormProps) {
  const router = useRouter();
  const { t } = useI18n();

  const available = members.filter((member) => !existingMemberIds.includes(member.id));

  const form = useForm<ProjectMemberFormValues>({
    resolver: zodResolver(projectMemberFormSchema),
    defaultValues: {
      memberId: "",
      projectRole: "OTHER",
      responsibility: "",
    },
  });

  async function onSubmit(values: ProjectMemberFormValues) {
    form.clearErrors("root");

    const result = await addProjectMemberAction(projectId, values);

    if (!result.success) {
      form.setError("root", { message: result.error });
      return;
    }

    toast.success(t("projects.team.form.title"));

    form.reset({ memberId: "", projectRole: "OTHER", responsibility: "" });

    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("projects.team.form.title")}</CardTitle>

        <CardDescription>{t("projects.team.empty.description")}</CardDescription>
      </CardHeader>

      <CardContent>
        <form noValidate onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup>
            {form.formState.errors.root && <FieldError errors={[form.formState.errors.root]} />}

            <div className="grid gap-5 sm:grid-cols-2">
              <Controller
                control={form.control}
                name="memberId"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>
                      {t("projects.team.form.member.label")}
                    </FieldLabel>

                    <NativeSelect {...field} id={field.name}>
                      <NativeSelectOption value="">
                        {t("projects.team.form.member.label")}
                      </NativeSelectOption>

                      {available.map((member) => (
                        <NativeSelectOption key={member.id} value={member.id}>
                          {member.name} · {member.email}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>

                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <Controller
                control={form.control}
                name="projectRole"
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor={field.name}>
                      {t("projects.team.form.role.label")}
                    </FieldLabel>

                    <NativeSelect {...field} id={field.name}>
                      {(
                        [
                          "PROJECT_MANAGER",
                          "PROJECT_ENGINEER",
                          "QUALITY_MANAGER",
                          "QUALITY_ENGINEER",
                          "PROCESS_ENGINEER",
                          "PRODUCTION_RESPONSIBLE",
                          "OTHER",
                        ] as const
                      ).map((role) => (
                        <NativeSelectOption key={role} value={role}>
                          {t(`projects.projectRole.${role}`)}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </Field>
                )}
              />
            </div>

            <Controller
              control={form.control}
              name="responsibility"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>
                    {t("projects.team.form.responsibility.label")}
                  </FieldLabel>

                  <Input
                    {...field}
                    aria-invalid={fieldState.invalid}
                    id={field.name}
                    value={field.value ?? ""}
                  />

                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <Button disabled={form.formState.isSubmitting} type="submit">
              {form.formState.isSubmitting
                ? t("customers.form.submitting")
                : t("projects.team.form.submit")}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
