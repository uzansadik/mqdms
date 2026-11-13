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
import { Field, FieldGroup, FieldLabel } from "@mqdms/ui/components/field";
import { NativeSelect, NativeSelectOption } from "@mqdms/ui/components/native-select";
import { Switch } from "@mqdms/ui/components/switch";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { assignProjectPlantAction } from "../actions";

type ProjectPlantsFormProps = {
  projectId: string;

  /** Atanabilecek tesisler. */
  plants: { id: string; code: string; name: string }[];

  /** Projeye atanmış tesis id'leri. */
  assignedPlantIds: string[];

  /** Projenin ana tesisi var mı? */
  hasPrimary: boolean;
};

/**
 * Projeye tesis atama formu.
 *
 * Proje, üretim tesislerinde birden fazla yürütülebilir; en fazla bir ana
 * tesisi olabilir.
 */
export function ProjectPlantsForm({
  projectId,
  plants,
  assignedPlantIds,
  hasPrimary,
}: ProjectPlantsFormProps) {
  const router = useRouter();
  const { t } = useI18n();
  const [isPending, startTransition] = useTransition();
  const [plantId, setPlantId] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);

  const available = plants.filter((plant) => !assignedPlantIds.includes(plant.id));

  function assign() {
    if (!plantId) {
      return;
    }

    startTransition(async () => {
      const result = await assignProjectPlantAction(projectId, plantId, isPrimary);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success(t("projects.plants.form.submit"));

      setPlantId("");
      setIsPrimary(false);

      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("projects.plants.form.title")}</CardTitle>

        <CardDescription>{t("projects.plants.empty.description")}</CardDescription>
      </CardHeader>

      <CardContent>
        <FieldGroup className="sm:flex-row sm:items-end">
          <Field className="flex-1">
            <FieldLabel htmlFor="plantId">{t("projects.plants.form.plant.label")}</FieldLabel>

            <NativeSelect
              disabled={isPending}
              id="plantId"
              onChange={(event) => setPlantId(event.target.value)}
              value={plantId}
            >
              <NativeSelectOption value="">
                {t("projects.plants.form.plant.label")}
              </NativeSelectOption>

              {available.map((plant) => (
                <NativeSelectOption key={plant.id} value={plant.id}>
                  {plant.code} · {plant.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>

          <Field className="sm:flex-row sm:items-center sm:gap-2">
            <Switch
              checked={isPrimary}
              disabled={hasPrimary}
              id="isPrimary"
              onCheckedChange={setIsPrimary}
            />

            <FieldLabel htmlFor="isPrimary">{t("projects.plants.form.isPrimary.label")}</FieldLabel>
          </Field>

          <Button disabled={isPending || !plantId} onClick={assign} type="button">
            {t("projects.plants.form.submit")}
          </Button>
        </FieldGroup>
      </CardContent>
    </Card>
  );
}
