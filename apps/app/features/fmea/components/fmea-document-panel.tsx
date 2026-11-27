"use client";

import { useI18n } from "@mqdms/i18n";
import { Badge } from "@mqdms/ui/components/badge";
import { Button } from "@mqdms/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@mqdms/ui/components/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@mqdms/ui/components/dialog";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@mqdms/ui/components/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@mqdms/ui/components/table";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { FmeaDocumentForm } from "./fmea-document-form";

/** Revision'daki FMEA belgesi. */
export type FmeaDocumentListItem = {
  id: string;
  code: string;
  name: string;
  fmeaType: "PFMEA" | "DFMEA" | "SFMEA";
  status: "DRAFT" | "IN_REVIEW" | "APPROVED" | "RELEASED";
  evaluationMethod: "ACTION_PRIORITY" | "RAG" | "BOTH";
};

type FmeaDocumentPanelProps = {
  revisionId: string;
  documents: FmeaDocumentListItem[];
  /** Belge detayının bulunduğu yol. */
  detailHref: (documentId: string) => string;
  /** Belge oluşturma yetkisi. */
  canCreate: boolean;
};

/**
 * Process Variant Revision içindeki FMEA belgeleri.
 *
 * FMEA, revision'ın teknik içeriğidir: belge yaşam döngüsü revision'ın
 * yaşam döngüsüyle birlikte yürür.
 */
export function FmeaDocumentPanel({
  revisionId,
  documents,
  detailHref,
  canCreate,
}: FmeaDocumentPanelProps) {
  const { t } = useI18n();
  const router = useRouter();

  const [isCreateOpen, setIsCreateOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-medium">{t("fmea.documents.title")}</h2>

          <p className="text-sm text-muted-foreground">{t("fmea.description")}</p>
        </div>

        {canCreate ? (
          <Dialog onOpenChange={setIsCreateOpen} open={isCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus />

                {t("fmea.documents.create")}
              </Button>
            </DialogTrigger>

            <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>{t("fmea.documents.create")}</DialogTitle>

                <DialogDescription>{t("fmea.description")}</DialogDescription>
              </DialogHeader>

              <FmeaDocumentForm
                onCreated={() => {
                  setIsCreateOpen(false);
                  router.refresh();
                }}
                revisionId={revisionId}
              />

              <DialogFooter>
                <Button onClick={() => setIsCreateOpen(false)} variant="outline">
                  {t("common.cancel")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        ) : null}
      </div>

      {documents.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("fmea.documents.empty.title")}</CardTitle>

            <CardDescription>{t("fmea.documents.empty.description")}</CardDescription>
          </CardHeader>

          <CardContent>
            <Empty>
              <EmptyHeader>
                <EmptyTitle>{t("fmea.documents.empty.title")}</EmptyTitle>

                <EmptyDescription>{t("fmea.documents.empty.description")}</EmptyDescription>
              </EmptyHeader>

              <EmptyContent />
            </Empty>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("fmea.documents.columns.code")}</TableHead>

                <TableHead>{t("fmea.documents.columns.name")}</TableHead>

                <TableHead>{t("fmea.documents.columns.type")}</TableHead>

                <TableHead>{t("fmea.documents.columns.status")}</TableHead>

                <TableHead>{t("fmea.documents.columns.method")}</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {documents.map((document) => (
                <TableRow key={document.id}>
                  <TableCell className="font-medium">
                    <Link className="hover:underline" href={detailHref(document.id)}>
                      {document.code}
                    </Link>
                  </TableCell>

                  <TableCell>
                    <Link className="hover:underline" href={detailHref(document.id)}>
                      {document.name}
                    </Link>
                  </TableCell>

                  <TableCell>
                    <Badge variant="outline">{t(`fmea.type.${document.fmeaType}`)}</Badge>
                  </TableCell>

                  <TableCell>
                    <Badge
                      variant={
                        document.status === "RELEASED"
                          ? "default"
                          : document.status === "DRAFT"
                            ? "secondary"
                            : "outline"
                      }
                    >
                      {t(`fmea.status.${document.status}`)}
                    </Badge>
                  </TableCell>

                  <TableCell>{t(`fmea.method.${document.evaluationMethod}`)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
