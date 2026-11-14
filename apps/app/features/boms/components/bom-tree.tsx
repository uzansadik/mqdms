"use client";

import { useI18n } from "@mqdms/i18n";
import { Badge } from "@mqdms/ui/components/badge";
import { Button } from "@mqdms/ui/components/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@mqdms/ui/components/collapsible";
import { ChevronRight } from "lucide-react";

import type { BomExplosionNode } from "../explosion";
import { BomLineActions } from "./bom-line-actions";

type BomTreeProps = {
  nodes: BomExplosionNode[];

  /**
   * Satırlar düzenlenebilir mi?
   *
   * Yayınlanmış bir revision'ın içeriği doğrudan değiştirilemez; bu yüzden
   * eylemler yalnızca düzenlenebilir revision'larda görünür.
   */
  editable?: boolean;
};

/**
 * Hiyerarşik BOM ağacı.
 *
 * Ağaç varsayılan olarak ilk iki seviye açık gelir; alt dallar
 * genişletilip daraltılabilir. Derinlik sınırı çözümleme servisinde
 * uygulanır: aşan dallar çözümlenmemiş olarak işaretlenir.
 */
export function BomTree({ nodes, editable = false }: BomTreeProps) {
  const { t } = useI18n();

  if (nodes.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("boms.explosion.empty")}</p>;
  }

  return (
    <ul className="space-y-1">
      {nodes.map((node) => (
        <BomTreeNode editable={editable} key={node.bomLineId ?? node.childItemId} node={node} />
      ))}
    </ul>
  );
}

/** Ağacın tek bir düğümü. */
function BomTreeNode({ node, editable }: { node: BomExplosionNode; editable: boolean }) {
  const { t } = useI18n();

  const hasChildren = node.children.length > 0;

  return (
    <li>
      <Collapsible defaultOpen={node.level <= 2}>
        <div
          className="flex flex-wrap items-center gap-2 rounded-md px-2 py-1 text-sm"
          style={{ paddingLeft: `${(node.level - 1) * 16 + 8}px` }}
        >
          {hasChildren ? (
            <CollapsibleTrigger asChild>
              <Button
                className="[&[data-state=open]_svg]:rotate-90 size-6 shrink-0"
                size="icon-xs"
                variant="ghost"
              >
                <ChevronRight className="size-4" />
                <span className="sr-only">{t("boms.explosion.toggle")}</span>
              </Button>
            </CollapsibleTrigger>
          ) : (
            <span className="size-6 shrink-0" />
          )}

          <span className="font-medium">{node.childItemCode ?? "-"}</span>

          <span className="text-muted-foreground">{node.childItemName ?? ""}</span>

          {node.childItemRevision && <Badge variant="outline">{node.childItemRevision}</Badge>}

          <span className="text-muted-foreground">
            {node.quantity}
            {node.unitOfMeasureCode ? ` ${node.unitOfMeasureCode}` : ""}
          </span>

          {node.referenceDesignation && (
            <span className="text-muted-foreground">{node.referenceDesignation}</span>
          )}

          {node.unresolved && <Badge variant="outline">{t("boms.explosion.unresolved")}</Badge>}

          {editable && node.bomLineId && (
            <BomLineActions
              childItemCode={node.childItemCode}
              lineId={node.bomLineId}
              referenceDesignation={node.referenceDesignation}
            />
          )}
        </div>

        {node.unresolved && node.unresolvedReason && (
          <p
            className="text-xs text-muted-foreground"
            style={{ paddingLeft: `${node.level * 16 + 8}px` }}
          >
            {node.unresolvedReason}
          </p>
        )}

        {hasChildren && (
          <CollapsibleContent>
            <ul className="space-y-1">
              {node.children.map((child) => (
                <BomTreeNode
                  editable={editable}
                  key={child.bomLineId ?? child.childItemId}
                  node={child}
                />
              ))}
            </ul>
          </CollapsibleContent>
        )}
      </Collapsible>
    </li>
  );
}
