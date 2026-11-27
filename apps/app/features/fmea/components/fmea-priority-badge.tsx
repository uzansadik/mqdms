"use client";

import { useI18n } from "@mqdms/i18n";
import { Badge } from "@mqdms/ui/components/badge";

import type { ActionPriority, RiskClass } from "../rating";

/**
 * Action Priority rozeti.
 *
 * `H` kırmızı, `M` sarı, `L` yeşildir. Action Priority bir **risk**
 * önceliklendirmesi değil, aksiyon ihtiyacının önceliklendirmesidir.
 */
export function FmeaPriorityBadge({ priority }: { priority: ActionPriority | null }) {
  const { t } = useI18n();

  if (!priority) {
    return <span className="text-muted-foreground">-</span>;
  }

  return (
    <Badge
      variant={priority === "H" ? "destructive" : "outline"}
      className={
        priority === "M" ? "border-yellow-500 text-yellow-700 dark:text-yellow-400" : undefined
      }
    >
      {t(`fmea.priority.${priority}`)}
    </Badge>
  );
}

/** Risk sınıfı rozeti. */
export function FmeaRiskBadge({ riskClass }: { riskClass: RiskClass | null }) {
  const { t } = useI18n();

  if (!riskClass) {
    return <span className="text-muted-foreground">-</span>;
  }

  return (
    <Badge
      variant="outline"
      className={
        riskClass === "A"
          ? "border-red-500 text-red-700 dark:text-red-400"
          : riskClass === "B"
            ? "border-yellow-500 text-yellow-700 dark:text-yellow-400"
            : undefined
      }
    >
      {t(`fmea.risk.${riskClass}`)}
    </Badge>
  );
}
