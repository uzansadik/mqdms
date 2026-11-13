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
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { upgradeFactoryRolesAction } from "../actions";

/**
 * Fabrika seed rollerini güncelleme.
 *
 * Yeni bir kaynak veya aksiyon eklendiğinde mevcut organizasyonların seed
 * rolleri geriye dönük güncellenmez: owner bu işlemi açıkça tetikler.
 * Yalnızca yeni sürümde tanımlanan izinler eklenir; owner'ın seed
 * rolünden kaldırdığı izinler geri gelmez.
 */
export function FactorySeedUpgrade() {
  const router = useRouter();
  const { t } = useI18n();
  const [isPending, startTransition] = useTransition();

  function upgrade() {
    startTransition(async () => {
      const result = await upgradeFactoryRolesAction();

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success(t("organization.roles.seedUpgrade.success", { count: result.upgradedRoles }));

      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("organization.roles.seedUpgrade.title")}</CardTitle>

        <CardDescription>{t("organization.roles.seedUpgrade.description")}</CardDescription>
      </CardHeader>

      <CardContent>
        <Button disabled={isPending} onClick={upgrade} variant="outline">
          {isPending
            ? t("organization.roles.seedUpgrade.running")
            : t("organization.roles.seedUpgrade.submit")}
        </Button>
      </CardContent>
    </Card>
  );
}
