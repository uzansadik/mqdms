"use client";

import { useI18n } from "@mqdms/i18n";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@mqdms/ui/components/select";

export function LanguageSelect() {
  const { locale, setLocale, isPending, t } = useI18n();

  return (
    <Select
      value={locale}
      onValueChange={(value) => setLocale(value as "en" | "tr")}
      disabled={isPending}
    >
      <SelectTrigger className="w-40">
        <SelectValue />
      </SelectTrigger>

      <SelectContent>
        <SelectItem value="en">{t("language.english")}</SelectItem>

        <SelectItem value="tr">{t("language.turkish")}</SelectItem>
      </SelectContent>
    </Select>
  );
}
