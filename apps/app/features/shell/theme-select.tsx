"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@mqdms/ui/components/select";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

type ThemeSelectProps = {
  /** Seçenek etiketleri; uygulama çevirilerinden gelir. */
  labels: {
    light: string;
    dark: string;
    system: string;
  };
};

/**
 * Tema seçimi.
 *
 * `next-themes` üzerine kuruludur: seçim `localStorage` ve çerezde saklanır,
 * "sistem" seçeneği işletim sistemi tercihini izler.
 */
export function ThemeSelect({ labels }: ThemeSelectProps) {
  const { theme, setTheme } = useTheme();

  /*
   * Sunucu ile istemci arasındaki uyumsuzluk hydration hatasına yol açabilir:
   * sunucu "sistem" varsayar, istemci kayıtlı temayı bilir. Uydurma (mounted)
   * kontrolü bu farkı gizler.
   */
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Select disabled value="system">
        <SelectTrigger className="w-40">
          <SelectValue />
        </SelectTrigger>

        <SelectContent>
          <SelectItem value="system">{labels.system}</SelectItem>
        </SelectContent>
      </Select>
    );
  }

  return (
    <Select onValueChange={(value) => setTheme(value)} value={theme}>
      <SelectTrigger className="w-40">
        <SelectValue />
      </SelectTrigger>

      <SelectContent>
        <SelectItem value="light">{labels.light}</SelectItem>

        <SelectItem value="dark">{labels.dark}</SelectItem>

        <SelectItem value="system">{labels.system}</SelectItem>
      </SelectContent>
    </Select>
  );
}
