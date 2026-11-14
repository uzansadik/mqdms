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
import { Input } from "@mqdms/ui/components/input";
import { NativeSelect, NativeSelectOption } from "@mqdms/ui/components/native-select";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { listBomComponentOptionsAction } from "@/features/boms/actions";

import { addProjectItemsAction } from "../actions";

type BulkItem = {
  id: string;
  code: string;
  name: string;
};

type BulkProjectItemFormProps = {
  /** Proje; sunucudan gelir. */
  projectId: string;

  /** Item kütüphanesindeki seçilebilir item'lar. */
  items: BulkItem[];

  /** Zaten projede olan item'lar; işaretli gelir ve seçilemez. */
  existingItemIds: string[];

  /** Kaynak olarak seçilebilecek deliverable BOM revision'ları. */
  bomSources: { id: string; label: string }[];
};

/**
 * Toplu item ekleme.
 *
 * Kullanıcı item kütüphanesinden çoklu item seçip hepsini projeye ekleyebilir:
 * örneğin elli FRP'yi kalite çalışması için proje kapsamına almak.
 *
 * Kaynak olarak bir deliverable BOM seçilebilir; bu durumda BOM'un çözümlenen
 * alt bileşenleri listelenir ve bunlardan seçim yapılır.
 *
 * Zaten projede olan item'lar seçilemez; toplu ekleme onları sessizce atlar.
 */
export function BulkProjectItemForm({
  projectId,
  items,
  existingItemIds,
  bomSources,
}: BulkProjectItemFormProps) {
  const router = useRouter();
  const { t } = useI18n();
  const [isPending, startTransition] = useTransition();

  const [sourceId, setSourceId] = useState("");
  const [bomItems, setBomItems] = useState<BulkItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  const existing = useMemo(() => new Set(existingItemIds), [existingItemIds]);

  /*
   * BOM kaynağı seçildiğinde bileşenler sunucudan istenir. BOM içeriği
   * istemciye önceden gönderilmez; her BOM yalnızca açıldığında çözülür.
   */
  useEffect(() => {
    if (!sourceId) {
      setBomItems([]);
      return;
    }

    let cancelled = false;

    setIsLoading(true);

    void (async () => {
      const result = await listBomComponentOptionsAction(sourceId);

      if (cancelled) {
        return;
      }

      setIsLoading(false);

      if (!result.success) {
        toast.error(result.error);
        setBomItems([]);
        return;
      }

      setBomItems(result.items);
    })();

    return () => {
      cancelled = true;
    };
  }, [sourceId]);

  const sourceItems = sourceId ? bomItems : items;

  const visible = useMemo(() => {
    const needle = filter.trim().toLowerCase();

    if (!needle) {
      return sourceItems;
    }

    return sourceItems.filter(
      (item) =>
        item.code.toLowerCase().includes(needle) || item.name.toLowerCase().includes(needle),
    );
  }, [filter, sourceItems]);

  const selectable = useMemo(
    () => visible.filter((item) => !existing.has(item.id)),
    [existing, visible],
  );

  function toggle(itemId: string) {
    setSelected((current) =>
      current.includes(itemId) ? current.filter((id) => id !== itemId) : [...current, itemId],
    );
  }

  function toggleAll() {
    const selectableIds = selectable.map((item) => item.id);

    setSelected((current) => {
      const allSelected = selectableIds.every((id) => current.includes(id));

      if (allSelected) {
        return current.filter((id) => !selectableIds.includes(id));
      }

      return [...new Set([...current, ...selectableIds])];
    });
  }

  function submit() {
    if (selected.length === 0) {
      return;
    }

    startTransition(async () => {
      const result = await addProjectItemsAction(projectId, selected);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success(t("projectItems.bulk.addedSuccess", { count: selected.length }));

      setSelected([]);
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("projectItems.bulk.title")}</CardTitle>

        <CardDescription>{t("projectItems.bulk.description")}</CardDescription>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {bomSources.length > 0 && (
            <Field>
              <FieldLabel htmlFor="bulk-source">{t("projectItems.bulk.source.label")}</FieldLabel>

              <NativeSelect
                id="bulk-source"
                onChange={(event) => {
                  setSourceId(event.target.value);
                  setSelected([]);
                }}
                value={sourceId}
              >
                <NativeSelectOption value="">
                  {t("projectItems.bulk.source.library")}
                </NativeSelectOption>

                {bomSources.map((source) => (
                  <NativeSelectOption key={source.id} value={source.id}>
                    {source.label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
          )}

          <Field>
            <FieldLabel htmlFor="bulk-filter">{t("projectItems.bulk.filter.label")}</FieldLabel>

            <Input
              id="bulk-filter"
              onChange={(event) => setFilter(event.target.value)}
              placeholder={t("projectItems.bulk.filter.placeholder")}
              value={filter}
            />
          </Field>

          <div className="max-h-72 overflow-y-auto rounded-lg border">
            {isLoading ? (
              <p className="p-4 text-sm text-muted-foreground">{t("projectItems.bulk.loading")}</p>
            ) : visible.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">{t("projectItems.bulk.empty")}</p>
            ) : (
              <ul className="divide-y">
                {visible.map((item) => {
                  const isExisting = existing.has(item.id);

                  return (
                    <li className="flex items-center gap-3 px-3 py-2" key={item.id}>
                      <Checkbox
                        checked={isExisting || selected.includes(item.id)}
                        disabled={isExisting}
                        onCheckedChange={() => toggle(item.id)}
                      />

                      <span className="flex-1 text-sm">
                        <span className="font-medium">{item.code}</span>{" "}
                        <span className="text-muted-foreground">{item.name}</span>
                      </span>

                      {isExisting && (
                        <Badge variant="secondary">{t("projectItems.bulk.inProject")}</Badge>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              disabled={isLoading || selectable.length === 0}
              onClick={toggleAll}
              type="button"
              variant="outline"
            >
              {t("projectItems.bulk.selectAll")}
            </Button>

            <Button disabled={isPending || selected.length === 0} onClick={submit} type="button">
              {t("projectItems.bulk.submit", { count: selected.length })}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
