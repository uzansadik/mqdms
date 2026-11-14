import { getTranslations } from "@mqdms/i18n/server";
import { Badge } from "@mqdms/ui/components/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@mqdms/ui/components/card";
import { notFound } from "next/navigation";

import { requireAuthContext } from "@/features/auth/session";
import { ImportMappingForm } from "@/features/imports/components/import-mapping-form";
import { importFields } from "@/features/imports/schema";
import { getImportJobDetail, requireImportsAccess } from "@/features/imports/server";

/**
 * Import işi ekranı: kolon eşleştirme, doğrulama ve çalıştırma.
 */
export default async function ImportJobPage({ params }: { params: Promise<{ id: string }> }) {
  const context = await requireAuthContext();

  await requireImportsAccess("read");

  const { id } = await params;

  const data = await getImportJobDetail(context.organizationId, id);

  if (!data) {
    notFound();
  }

  const t = await getTranslations();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{data.job.fileName}</h1>

        <p className="mt-1 text-sm text-muted-foreground">
          {t(`imports.types.${data.job.importType}`)} ·{" "}
          <Badge variant="secondary">{t(`imports.status.${data.job.status}`)}</Badge>
        </p>
      </div>

      {data.errors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t("imports.errors.title")}</CardTitle>
          </CardHeader>

          <CardContent>
            <ul className="space-y-1 text-sm text-destructive">
              {data.errors.map((error) => (
                <li key={error.id}>
                  {error.rowNumber ? `Satır ${error.rowNumber}: ` : ""}
                  {error.message}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <ImportMappingForm
        fields={importFields[data.job.importType]}
        headers={data.headers}
        importJobId={data.job.id}
        importType={data.job.importType}
        initialMapping={data.job.columnMapping}
      />
    </div>
  );
}
