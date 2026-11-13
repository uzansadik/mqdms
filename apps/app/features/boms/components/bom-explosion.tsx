import { getTranslations } from "@mqdms/i18n/server";
import { Badge } from "@mqdms/ui/components/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@mqdms/ui/components/table";

import type { BomExplosionNode, BomFlattenedLine } from "../explosion";
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
 * Ağaç sınırsız derinlikte render edilmez: çözümleme servisi derinlik
 * sınırı uygular ve aşan dallar çözümlenmemiş olarak işaretlenir.
 */
export async function BomTree({ nodes, editable = false }: BomTreeProps) {
  const t = await getTranslations();

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
async function BomTreeNode({ node, editable }: { node: BomExplosionNode; editable: boolean }) {
  const t = await getTranslations();

  return (
    <li>
      <div
        className="flex flex-wrap items-center gap-2 rounded-md px-2 py-1 text-sm"
        style={{ paddingLeft: `${(node.level - 1) * 16 + 8}px` }}
      >
        {node.level > 1 && <span className="text-muted-foreground">└</span>}

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

      {node.children.length > 0 && (
        <ul className="space-y-1">
          {node.children.map((child) => (
            <BomTreeNode
              editable={editable}
              key={child.bomLineId ?? child.childItemId}
              node={child}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

type BomFlattenedTableProps = {
  lines: BomFlattenedLine[];
};

/**
 * Düzleştirilmiş BOM.
 *
 * Aynı bileşen farklı revision veya farklı birimle kullanılıyorsa doğrulanmadan
 * tek satırda birleştirilmez; gruplama anahtarı ürün, revision ve birimdir.
 */
export async function BomFlattenedTable({ lines }: BomFlattenedTableProps) {
  const t = await getTranslations();

  if (lines.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("boms.explosion.empty")}</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("boms.explosion.columns.item")}</TableHead>

          <TableHead>{t("boms.explosion.columns.revision")}</TableHead>

          <TableHead>{t("boms.explosion.columns.quantity")}</TableHead>

          <TableHead>{t("boms.explosion.columns.occurrences")}</TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        {lines.map((line) => (
          <TableRow
            key={`${line.childItemId}|${line.childItemRevision ?? ""}|${line.unitOfMeasureId ?? ""}`}
          >
            <TableCell className="font-medium">
              {line.childItemCode ?? "-"}
              <span className="block text-xs text-muted-foreground">
                {line.childItemName ?? ""}
              </span>
            </TableCell>

            <TableCell>{line.childItemRevision ?? "-"}</TableCell>

            <TableCell>
              {line.quantity}
              {line.unitOfMeasureCode ? ` ${line.unitOfMeasureCode}` : ""}
            </TableCell>

            <TableCell>
              {line.occurrenceCount}
              {line.unresolved && (
                <Badge className="ml-2" variant="outline">
                  {t("boms.explosion.unresolved")}
                </Badge>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
