import { getTranslations } from "@mqdms/i18n/server";
import { Badge } from "@mqdms/ui/components/badge";
import { Button } from "@mqdms/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@mqdms/ui/components/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@mqdms/ui/components/empty";
import Link from "next/link";

import { BomTree } from "@/features/boms/components/bom-explosion";
import type { BomExplosionNode } from "@/features/boms/explosion";
import { StatusBadge } from "@/features/shared/status-badge";

import type { ProjectBomRevisionRecord } from "../repository";

type ProjectBomListProps = {
  /** Projeye bağlanmış revision'lar. */
  revisions: ProjectBomRevisionRecord[];

  /** Her revision için çözümlenen bileşen ağacı; `revisions` ile sıra eşleşir. */
  trees: BomExplosionNode[][];
};

/**
 * Projenin BOM sekmesi.
 *
 * Proje ürünlerine bağlanmış her BOM revision'ı için hiyerarşik bileşen
 * ağacı gösterilir. Ağaç salt okunurdur; düzenleme BOM detay sayfasında
 * yapılır.
 */
export async function ProjectBomList({ revisions, trees }: ProjectBomListProps) {
  const t = await getTranslations();

  if (revisions.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>{t("projects.boms.empty.title")}</EmptyTitle>

          <EmptyDescription>{t("projects.boms.empty.description")}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <>
      {revisions.map((revision, index) => (
        <Card key={revision.bomRevisionId}>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle>
                  {revision.bomCode} · {revision.bomName}
                </CardTitle>

                <p className="mt-1 text-sm text-muted-foreground">
                  {revision.itemCode} · {revision.itemName}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{revision.revision}</Badge>

                <StatusBadge
                  label={t(`boms.revisions.status.${revision.status}`)}
                  status={revision.status}
                />

                <Button asChild size="sm" variant="outline">
                  <Link href={`/boms/${revision.bomId}`}>{t("projects.boms.open")}</Link>
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <BomTree nodes={trees[index] ?? []} />
          </CardContent>
        </Card>
      ))}
    </>
  );
}
