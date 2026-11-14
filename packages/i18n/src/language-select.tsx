"use client";

import { useI18n } from "@mqdms/i18n";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@mqdms/ui/components/select";

type LanguageSelectProps = {
  /**
   * Seçiciye verilen erişilebilir ad.
   *
   * Görünen etiket seçiciyle ilişkilendirilemiyorsa (ör. ayar kartında
   * başlık ayrı bir bileşende) erişilebilir ad verilmelidir.
   */
  ariaLabel?: string;
};

export function LanguageSelect({ ariaLabel }: LanguageSelectProps) {
  const { locale, setLocale, isPending, t } = useI18n();

  return (
    <Select
      value={locale}
      onValueChange={(value) => setLocale(value as "en" | "tr")}
      disabled={isPending}
    >
      <SelectTrigger aria-label={ariaLabel} className="w-40">
        <SelectValue />
      </SelectTrigger>

      <SelectContent>
        <SelectItem value="en">{t("language.english")}</SelectItem>

        <SelectItem value="tr">{t("language.turkish")}</SelectItem>
      </SelectContent>
    </Select>
  );
}
