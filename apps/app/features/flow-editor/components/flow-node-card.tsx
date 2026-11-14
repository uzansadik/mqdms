"use client";

import { useI18n } from "@mqdms/i18n";
import { Badge } from "@mqdms/ui/components/badge";
import { cn } from "@mqdms/ui/lib/utils";
import { Handle, type NodeProps, Position } from "@xyflow/react";

import type { FlowNodeType } from "../schema";

/**
 * Akış node'u.
 *
 * Node türüne göre ikon ve renk değişir; karar node'unda birden fazla
 * çıkış tutamacı bulunur.
 */
export function FlowNodeCard({ data, selected }: NodeProps) {
  const { t } = useI18n();

  const nodeType = (data.nodeType ?? "ACTIVITY") as FlowNodeType;
  const title = typeof data.title === "string" ? data.title : "-";
  const description = typeof data.description === "string" ? data.description : "";

  const isStart = nodeType === "START";
  const isEnd = nodeType === "END";
  const isDecision = nodeType === "DECISION";

  return (
    <div
      className={cn(
        "w-44 rounded-lg border bg-card px-3 py-2 text-sm shadow-sm transition",
        selected ? "border-primary ring-2 ring-primary/30" : "border-border",
      )}
    >
      {!isStart && (
        <Handle className="!left-0 !bg-muted-foreground" position={Position.Left} type="target" />
      )}

      <div className="flex items-center justify-between gap-2">
        <span className="truncate font-medium">{title}</span>

        <Badge variant="outline">{t(`flow.nodeTypes.${nodeType}`)}</Badge>
      </div>

      {description ? (
        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{description}</p>
      ) : null}

      {isDecision && (
        <>
          <Handle
            className="!bg-muted-foreground"
            id="yes"
            position={Position.Right}
            style={{ top: "35%" }}
            type="source"
          />
          <Handle
            className="!bg-muted-foreground"
            id="no"
            position={Position.Right}
            style={{ top: "70%" }}
            type="source"
          />
        </>
      )}

      {!isEnd && !isDecision && (
        <Handle className="!bg-muted-foreground" position={Position.Right} type="source" />
      )}

      {isEnd && <Handle className="!bg-muted-foreground" position={Position.Right} type="source" />}
    </div>
  );
}
