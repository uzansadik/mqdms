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
import Link from "next/link";

import { requireAuthContext } from "@/features/auth/session";
import { ImportUpload } from "@/features/imports/components/import-upload";
import { importTypeSchema } from "@/features/imports/schema";
import { getImportJobList, requireImportsAccess } from "@/features/imports/server";

/**
 * İçe aktarım ekranı.
 *
 * Dosya yüklenir, kolonlar eşleştirilir, satırlar doğrulanır ve
 * kullanıcı onayından sonra yazılır.
 */
export default async function ImportsPage() {
  const context = await requireAuthContext();

  await requireImportsAccess("read");

  const t = await getTranslations();

  const jobs = await getImportJobList(context.organizationId);

  const importTypes = importTypeSchema.options.map((value) => ({
    value,
    label: t(`imports.types.${value}`),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("imports.title")}</h1>

        <p className="mt-1 text-sm text-muted-foreground">{t("imports.description")}</p>
      </div>

      <ImportUpload importTypes={importTypes} />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("imports.history.columns.file")}</TableHead>

            <TableHead>{t("imports.history.columns.type")}</TableHead>

            <TableHead>{t("imports.history.columns.status")}</TableHead>

            <TableHead>{t("imports.history.columns.rows")}</TableHead>

            <TableHead>{t("imports.history.columns.createdAt")}</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {jobs.map((job) => (
            <TableRow key={job.id}>
              <TableCell className="font-medium">
                <Link className="hover:underline" href={`/imports/${job.id}`}>
                  {job.fileName}
                </Link>
              </TableCell>

              <TableCell>{t(`imports.types.${job.importType}`)}</TableCell>

              <TableCell>
                <Badge variant={job.status === "COMPLETED" ? "default" : "secondary"}>
                  {t(`imports.status.${job.status}`)}
                </Badge>
              </TableCell>

              <TableCell>
                {job.totalRows}
                {job.errorCount > 0 ? ` · ${job.errorCount} hata` : ""}
              </TableCell>

              <TableCell>{job.createdAt.toISOString().slice(0, 10)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
