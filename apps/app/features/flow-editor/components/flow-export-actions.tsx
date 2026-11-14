"use client";

import { useI18n } from "@mqdms/i18n";
import { Button } from "@mqdms/ui/components/button";
import { toast } from "sonner";

import { type ExportEdge, type ExportNode, renderFlowToCanvas } from "../export-image";

type FlowExportActionsProps = {
  /** Dışa aktarılacak node'lar. */
  nodes: ExportNode[];

  /** Dışa aktarılacak edge'ler. */
  edges: ExportEdge[];

  /** Yazdırma görünümünün adresi. */
  printHref: string;

  /** İndirilen dosyanın adı. */
  fileName: string;
};

/**
 * Flow için görsel çıktı ve yazdırma eylemleri.
 *
 * PNG çıktısı canvas üzerine çizilir; diyagram müşteri dokümanlarına
 * eklenebilir. Ayrıca salt okunur yazdırma görünümüne bağlantı verilir.
 */
export function FlowExportActions({ nodes, edges, printHref, fileName }: FlowExportActionsProps) {
  const { t } = useI18n();

  function downloadPng() {
    if (nodes.length === 0) {
      toast.error(t("flow.export.empty"));

      return;
    }

    const canvas = document.createElement("canvas");

    renderFlowToCanvas(canvas, nodes, edges, { scale: 2 });

    const link = document.createElement("a");

    link.download = `${fileName}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();

    toast.success(t("flow.export.downloaded"));
  }

  return (
    <div className="flex gap-2">
      <Button onClick={downloadPng} size="sm" type="button" variant="outline">
        {t("flow.export.png")}
      </Button>

      <Button asChild size="sm" variant="outline">
        <a href={printHref}>{t("flow.export.print")}</a>
      </Button>
    </div>
  );
}
