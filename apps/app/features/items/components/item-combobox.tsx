"use client";

import { useI18n } from "@mqdms/i18n";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@mqdms/ui/components/combobox";
import { useMemo } from "react";

/** Seçilebilir item. */
export type ComboboxItemValue = {
  id: string;
  code: string;
  name: string;
};

type ItemComboboxProps = {
  /** Seçilebilir item'lar. */
  items: ComboboxItemValue[];

  /** Seçili item'ın id'si. */
  value: string;

  /** Seçim değişti. */
  onValueChange: (itemId: string) => void;

  /** Girdi alanının id'si. */
  id?: string;

  /** Geçersiz mi? */
  invalid?: boolean;
};

/**
 * Aranabilir item seçici.
 *
 * Item kütüphanesi büyüdükçe düz bir açılır liste kullanılamaz: kullanıcı
 * kodun ya da adın bir bölümünü yazarak arar.
 */
export function ItemCombobox({ items, value, onValueChange, id, invalid }: ItemComboboxProps) {
  const { t } = useI18n();

  const selected = useMemo(() => items.find((item) => item.id === value) ?? null, [items, value]);

  return (
    <Combobox
      filter={(item, query) => {
        const needle = query.trim().toLowerCase();

        if (!needle) {
          return true;
        }

        return item.code.toLowerCase().includes(needle) || item.name.toLowerCase().includes(needle);
      }}
      itemToStringLabel={(item) => `${item.code} · ${item.name}`}
      items={items}
      onValueChange={(item) => onValueChange(item?.id ?? "")}
      value={selected}
    >
      <ComboboxInput
        aria-invalid={invalid}
        id={id}
        placeholder={t("items.combobox.placeholder")}
        showClear
      />

      <ComboboxContent>
        <ComboboxEmpty>{t("items.combobox.empty")}</ComboboxEmpty>

        <ComboboxList>
          {(item: ComboboxItemValue) => (
            <ComboboxItem key={item.id} value={item}>
              {item.code} · {item.name}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
