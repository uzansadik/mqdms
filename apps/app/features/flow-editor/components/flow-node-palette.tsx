"use client";

import { useI18n } from "@mqdms/i18n";
import { Badge } from "@mqdms/ui/components/badge";

import type { FlowNodeType } from "../schema";

/** Paletde sunulan node tipleri. */
export const PALETTE_NODE_TYPES: FlowNodeType[] = [
  "START",
  "ACTIVITY",
  "INSPECTION",
  "DECISION",
  "STORAGE",
  "TRANSPORT",
  "DOCUMENT",
  "SUBPROCESS",
  "END",
];

type FlowNodePaletteProps = {
  /** Node'un sürükle-bırak ile başlatılması. */
  onDragStart: (nodeType: FlowNodeType) => void;
};

/** Sol panel: node paleti. */
export function FlowNodePalette({ onDragStart }: FlowNodePaletteProps) {
  const { t } = useI18n();

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">{t("flow.palette.title")}</p>

      <div className="flex flex-wrap gap-1.5">
        {PALETTE_NODE_TYPES.map((nodeType) => (
          <Badge
            className="cursor-grab select-none"
            key={nodeType}
            onDragStart={() => onDragStart(nodeType)}
            variant="outline"
          >
            {t(`flow.nodeTypes.${nodeType}`)}
          </Badge>
        ))}
      </div>
    </div>
  );
}
