import { getTranslations } from "@mqdms/i18n/server";
import { cn } from "@mqdms/ui/lib/utils";

import type { BomTreeNode } from "../tree";

type BomTreeViewProps = {
  /** Ağaç düğümleri. */
  nodes: BomTreeNode[];
};

/**
 * Salt okunur BOM ağacı.
 *
 * Proje bağlamında bağlanmış revision'ların ağacı gösterilir; düzenleme BOM
 * detay sayfasında yapılır.
 */
export async function BomTreeView({ nodes }: BomTreeViewProps) {
  const t = await getTranslations();

  if (nodes.length === 0) {
    return <p className="text-muted-foreground text-sm">{t("boms.explosion.empty")}</p>;
  }

  return (
    <ul className="space-y-1 text-sm">
      {nodes.map((node) => (
        <BomTreeViewNode key={node.line.id} node={node} />
      ))}
    </ul>
  );
}

/** Tek bir ağaç düğümü. */
function BomTreeViewNode({ node }: { node: BomTreeNode }) {
  return (
    <li>
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground text-xs">{node.path}</span>

        <span className="font-medium">{node.line.childItemCode ?? "-"}</span>

        <span className="truncate">{node.line.childItemName ?? "-"}</span>

        <span className="text-muted-foreground">
          {node.line.quantity} {node.line.unitOfMeasureCode ?? ""}
        </span>
      </div>

      {node.children.length > 0 ? (
        <ul className={cn("mt-1 space-y-1 border-l pl-4")}>
          {node.children.map((child) => (
            <BomTreeViewNode key={child.line.id} node={child} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}
