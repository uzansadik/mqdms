"use client";

import { useI18n } from "@mqdms/i18n";
import { Label } from "@mqdms/ui/components/label";
import { NativeSelect, NativeSelectOption } from "@mqdms/ui/components/native-select";
import { Textarea } from "@mqdms/ui/components/textarea";

/**
 * 1–10 arası derece girişi.
 *
 * Dereceler doğrudan sayısal alan olarak girilir. Önleme ve algılama
 * kontrollerinin etkinliği için `suggestion` ile önerilen değer gösterilir.
 */
export type FmeaRatingFieldProps = {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  /** Etkinlik derecesine göre önerilen değer. */
  suggestion?: number | null;
};

const RATINGS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

export function FmeaRatingField({
  id,
  label,
  value,
  onChange,
  disabled,
  suggestion,
}: FmeaRatingFieldProps) {
  const { t } = useI18n();

  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>

      <NativeSelect
        disabled={disabled}
        id={id}
        onChange={(event) => onChange(Number(event.target.value))}
        value={String(value)}
      >
        {RATINGS.map((rating) => (
          <NativeSelectOption key={rating} value={String(rating)}>
            {rating}
          </NativeSelectOption>
        ))}
      </NativeSelect>

      {suggestion ? (
        <p className="text-xs text-muted-foreground">
          {t("fmea.rating.suggestion", { value: suggestion })}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Çok satırlı metin alanı.
 *
 * Hata modu, etki ve kontrol açıklamaları için kullanılır.
 */
export function FmeaTextField({
  id,
  label,
  value,
  onChange,
  disabled,
  rows = 2,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  rows?: number;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>

      <Textarea
        disabled={disabled}
        id={id}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        value={value}
      />
    </div>
  );
}
