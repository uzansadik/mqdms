"use client";

import { useI18n } from "@mqdms/i18n";
import { Button } from "@mqdms/ui/components/button";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { seedProcessLibraryTemplateAction } from "../actions";

/**
 * Başlangıç şablonunu yükleyen düğme.
 *
 * Şablon hiçbir organizasyona otomatik yüklenmez; yalnızca bu düğmeye
 * basıldığında kurulur. Kurulum idempotenttir: var olan kayıtlar atlanır.
 */
export function ProcessLibrarySeedButton() {
  const router = useRouter();
  const { t } = useI18n();
  const [isPending, startTransition] = useTransition();

  function seed() {
    startTransition(async () => {
      const result = await seedProcessLibraryTemplateAction();

      if (!result.success) {
        toast.error(result.error);

        return;
      }

      toast.success(
        t("processLibrarySeed.success", {
          created: result.created,
          skipped: result.skipped,
        }),
      );

      router.refresh();
    });
  }

  return (
    <Button disabled={isPending} onClick={seed} type="button" variant="outline">
      {isPending ? t("processLibrarySeed.running") : t("processLibrarySeed.submit")}
    </Button>
  );
}
