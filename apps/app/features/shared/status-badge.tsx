import { Badge } from "@mqdms/ui/components/badge";

type StatusBadgeProps = {
  /** Kaydın durumu (`ACTIVE`, `INACTIVE`, `DRAFT`, ...). */
  status: string;

  /** Durumun görünen adı; çeviri katmanından gelir. */
  label: string;
};

/**
 * Durum rozeti.
 *
 * Aktif kayıtlar vurgulanır, pasif kayıtlar sakin gösterilir.
 */
export function StatusBadge({ status, label }: StatusBadgeProps) {
  return <Badge variant={status === "ACTIVE" ? "default" : "secondary"}>{label}</Badge>;
}
