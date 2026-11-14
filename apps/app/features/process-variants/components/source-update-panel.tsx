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
import { Checkbox } from "@mqdms/ui/components/checkbox";
import { Field, FieldLabel } from "@mqdms/ui/components/field";
import { NativeSelect, NativeSelectOption } from "@mqdms/ui/components/native-select";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  applySourceUpdateAction,
  getSourceUpdateChangesAction,
  type SourceUpdateChange,
} from "../actions";
import { defaultSelections, selectionKey } from "../source-selection";

type SourceUpdatePanelProps = {
  /** Güncelleme yapılacak hedef revision. */
  targetRevisionId: string;

  /** Varyantın türetildiği kaynak revision. */
  lineageSource: {
    id: string;
    revision: string;
    variantCode: string;
    variantName: string;
  };

  /** Lineage kaynağından sonra yayınlanmış revision'lar. */
  candidates: {
    id: string;
    revision: string;
  }[];

  /** Kullanıcının güncelleme yetkisi var mı? */
  canUpdate: boolean;
};

/** Değişiklik seçim anahtarı. */
function changeKey(change: SourceUpdateChange): string {
  return selectionKey({ category: change.category, logicalId: change.logicalId });
}

/**
 * Kontrollü kaynak güncelleme paneli.
 *
 * Kullanıcı yeni kaynak revision'ı seçer, değişiklikleri görüntüler ve
 * aktarmak istediği kayıtları seçerek hedef `DRAFT` revision'a uygular.
 *
 * Yayınlanmış revision otomatik değiştirilmez; hedef taslak olmalıdır.
 */
export function SourceUpdatePanel({
  targetRevisionId,
  lineageSource,
  candidates,
  canUpdate,
}: SourceUpdatePanelProps) {
  const router = useRouter();
  const { t } = useI18n();
  const [isPending, startTransition] = useTransition();

  const [sourceId, setSourceId] = useState(candidates[0]?.id ?? "");
  const [changes, setChanges] = useState<SourceUpdateChange[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  function loadChanges(nextSourceId: string) {
    if (!nextSourceId) {
      return;
    }

    setIsLoading(true);

    void getSourceUpdateChangesAction({
      targetRevisionId,
      sourceRevisionId: nextSourceId,
    }).then((result) => {
      setIsLoading(false);

      if (!result.success) {
        toast.error(result.error);

        return;
      }

      setChanges(result.technical);
      // Varsayılan olarak aktarılabilir teknik değişikliklerin tamamı seçilir;
      // kullanıcı özelleştirmesini elde edebilir.
      setSelected(defaultSelections(result.technical));
    });
  }

  function toggle(key: string, checked: boolean) {
    setSelected((current) =>
      checked ? [...new Set([...current, key])] : current.filter((entry) => entry !== key),
    );
  }

  function apply() {
    const selections = changes
      .filter((change) => selected.includes(selectionKey(change)))
      .map((change) => ({ category: change.category, logicalId: change.logicalId }));

    if (selections.length === 0) {
      toast.error(t("processVariants.sourceUpdate.errors.noSelection"));

      return;
    }

    startTransition(async () => {
      const result = await applySourceUpdateAction({
        targetRevisionId,
        sourceRevisionId: sourceId,
        selections,
      });

      if (!result.success) {
        toast.error(result.error);

        return;
      }

      toast.success(t("processVariants.sourceUpdate.actions.applied"));

      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("processVariants.sourceUpdate.title")}</CardTitle>

          <CardDescription>{t("processVariants.sourceUpdate.description")}</CardDescription>
        </CardHeader>

        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-muted-foreground">
                {t("processVariants.sourceUpdate.lineage")}
              </dt>

              <dd className="text-sm">
                {lineageSource.variantCode} · {lineageSource.revision}
              </dd>
            </div>

            <div>
              <dt className="text-sm text-muted-foreground">
                {t("processVariants.sourceUpdate.newerSource")}
              </dt>

              <dd className="text-sm">
                {candidates.length === 0 ? t("processVariants.sourceUpdate.noUpdate") : "-"}
              </dd>
            </div>
          </dl>

          {candidates.length > 0 && (
            <div className="mt-5 space-y-4">
              <Field>
                <FieldLabel htmlFor="source-update-source">
                  {t("processVariants.sourceUpdate.form.source")}
                </FieldLabel>

                <NativeSelect
                  id="source-update-source"
                  onChange={(event) => {
                    setSourceId(event.target.value);
                    loadChanges(event.target.value);
                  }}
                  value={sourceId}
                >
                  {candidates.map((candidate) => (
                    <NativeSelectOption key={candidate.id} value={candidate.id}>
                      {candidate.revision}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>

              <Button
                disabled={isLoading || !sourceId}
                onClick={() => loadChanges(sourceId)}
                type="button"
                variant="outline"
              >
                {t("processVariants.sourceUpdate.form.compare")}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {changes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("processVariants.sourceUpdate.changes.title")}</CardTitle>

            <CardDescription>
              {t("processVariants.sourceUpdate.changes.description")}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="space-y-2">
              {changes.map((change) => {
                const key = changeKey(change);

                // Kaynakta silinmiş kayıtlar aktarılamaz; silme işlemi otomatik
                // yapılmaz, kullanıcı kaydı kendi revision'ında tutabilir.
                const transferable = change.type !== "REMOVED";

                return (
                  <div className="flex items-start gap-3 rounded-md border p-2 text-sm" key={key}>
                    <Checkbox
                      checked={selected.includes(key)}
                      disabled={!canUpdate || !transferable}
                      id={`source-update-${key}`}
                      onCheckedChange={(checked) => toggle(key, checked === true)}
                    />

                    <label className="flex-1 cursor-pointer" htmlFor={`source-update-${key}`}>
                      <span className="font-medium">{change.label}</span>{" "}
                      <span className="text-muted-foreground">
                        {t(`processVariants.compare.categories.${change.category}`)}
                      </span>
                      {!transferable && (
                        <span className="block text-xs text-muted-foreground">
                          {t("processVariants.sourceUpdate.changes.removedNote")}
                        </span>
                      )}
                    </label>

                    <Badge variant="outline">
                      {t(`processVariants.compare.types.${change.type}`)}
                    </Badge>
                  </div>
                );
              })}
            </div>

            <Button
              className="mt-5"
              disabled={!canUpdate || isPending || selected.length === 0}
              onClick={apply}
              type="button"
            >
              {t("processVariants.sourceUpdate.actions.apply")}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
