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

import { CustomerItemRevisionForm } from "./customer-item-revision-form";

type CustomerItemListProps = {
  customerItems: {
    id: string;
    customerId: string;
    customerName: string | null;
    customerPartNumber: string;
    customerPartName: string | null;
    scope: string | null;
    status: "ACTIVE" | "INACTIVE";
  }[];

  /** Her müşteri ürününün revision eşleştirmeleri. */
  revisions: Record<
    string,
    {
      id: string;
      customerRevision: string;
      internalRevision: string | null;
      drawingReference: string | null;
      drawingRevision: string | null;
      status: "DRAFT" | "RELEASED" | "SUPERSEDED";
    }[]
  >;

  /** Ürünün kendi revision'ları (iç revision eşleştirmesi için). */
  internalRevisions: { id: string; revision: string; status: string }[];
};

/**
 * Bir ürünün müşteri referansları.
 *
 * Her referansın altında müşteri revision eşleştirmeleri listelenir.
 */
export async function CustomerItemList({
  customerItems,
  revisions,
  internalRevisions,
}: CustomerItemListProps) {
  const t = await getTranslations();

  return (
    <div className="space-y-6">
      {customerItems.map((customerItem) => {
        const itemRevisions = revisions[customerItem.id] ?? [];

        return (
          <div key={customerItem.id} className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="text-base font-semibold">
                {customerItem.customerName ?? "-"} · {customerItem.customerPartNumber}
              </h3>

              {customerItem.customerPartName && (
                <span className="text-sm text-muted-foreground">
                  {customerItem.customerPartName}
                </span>
              )}

              {customerItem.scope && <Badge variant="outline">{customerItem.scope}</Badge>}

              <Badge variant={customerItem.status === "ACTIVE" ? "default" : "secondary"}>
                {t(`items.status.${customerItem.status}`)}
              </Badge>
            </div>

            {itemRevisions.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("customerItems.revisions.empty")}</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("customerItems.revisions.columns.customerRevision")}</TableHead>

                    <TableHead>{t("customerItems.revisions.columns.internalRevision")}</TableHead>

                    <TableHead>{t("customerItems.revisions.columns.drawing")}</TableHead>

                    <TableHead>{t("customerItems.revisions.columns.status")}</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {itemRevisions.map((revision) => (
                    <TableRow key={revision.id}>
                      <TableCell className="font-medium">{revision.customerRevision}</TableCell>

                      <TableCell>{revision.internalRevision ?? "-"}</TableCell>

                      <TableCell>
                        {revision.drawingReference
                          ? `${revision.drawingReference}${
                              revision.drawingRevision ? ` · ${revision.drawingRevision}` : ""
                            }`
                          : "-"}
                      </TableCell>

                      <TableCell>
                        {t(`customerItems.revisions.status.${revision.status}`)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            <CustomerItemRevisionForm
              customerItemId={customerItem.id}
              internalRevisions={internalRevisions}
            />
          </div>
        );
      })}
    </div>
  );
}
