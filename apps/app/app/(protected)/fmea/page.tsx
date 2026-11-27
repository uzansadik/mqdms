import { getTranslations } from "@mqdms/i18n/server";
import { Badge } from "@mqdms/ui/components/badge";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@mqdms/ui/components/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@mqdms/ui/components/table";
import Link from "next/link";

import { requireAuthContext } from "@/features/auth/session";
import { getFmeaDocumentHref, getFmeaIndexData, requireFmeaAccess } from "@/features/fmea/server";

/**
 * FMEA dizini.
 *
 * FMEA belgeleri Process Variant Revision'a bağlıdır; bu sayfa tüm
 * organizasyonun belgelerini listeler ve belge detayına yönlendirir.
 */
export default async function FmeaIndexPage() {
  const context = await requireAuthContext();

  await requireFmeaAccess("read");

  const data = await getFmeaIndexData(context.organizationId);

  const t = await getTranslations();

  const hrefs = await Promise.all(
    data.documents.map((document) => getFmeaDocumentHref(context.organizationId, document.id)),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("fmea.title")}</h1>

        <p className="mt-1 text-sm text-muted-foreground">{t("fmea.description")}</p>
      </div>

      {data.documents.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>{t("fmea.documents.empty.title")}</EmptyTitle>

            <EmptyDescription>{t("fmea.documents.empty.description")}</EmptyDescription>
          </EmptyHeader>
        </Empty>
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
              {data.documents.map((document, index) => {
                const href = hrefs[index];

                return (
                  <TableRow key={document.id}>
                    <TableCell className="font-medium">
                      {href ? (
                        <Link className="hover:underline" href={href}>
                          {document.code}
                        </Link>
                      ) : (
                        document.code
                      )}
                    </TableCell>

                    <TableCell>{document.name}</TableCell>

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
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
