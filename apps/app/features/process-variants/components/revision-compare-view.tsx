import { getTranslations } from "@mqdms/i18n/server";
import { Badge } from "@mqdms/ui/components/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@mqdms/ui/components/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@mqdms/ui/components/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@mqdms/ui/components/table";

import type { RevisionChange } from "../comparison";

type RevisionCompareViewProps = {
  /** Karşılaştırılan eski revision. */
  from: { id: string; revision: string };

  /** Karşılaştırılan yeni revision. */
  to: { id: string; revision: string };

  /** Teknik değişiklikler. */
  technical: RevisionChange[];

  /** Yalnızca görsel düzen değişiklikleri. */
  layout: RevisionChange[];
};

/** Değişiklik tipine göre rozet rengi. */
function typeVariant(type: RevisionChange["type"]) {
  if (type === "ADDED") {
    return "default" as const;
  }

  if (type === "REMOVED") {
    return "destructive" as const;
  }

  return "outline" as const;
}

/**
 * İki revision arasındaki farkın görünümü.
 *
 * Teknik değişiklikler ve yalnızca görsel düzen değişiklikleri ayrı gösterilir:
 * bir node'un taşınması teknik proses değişikliği değildir.
 */
export async function RevisionCompareView({
  from,
  to,
  technical,
  layout,
}: RevisionCompareViewProps) {
  const t = await getTranslations();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("processVariants.compare.title")}</CardTitle>
        </CardHeader>

        <CardContent>
          <p className="text-sm text-muted-foreground">
            {t("processVariants.compare.description")}
          </p>

          <div className="mt-4 flex flex-wrap gap-6 text-sm">
            <div>
              <span className="text-muted-foreground">{t("processVariants.compare.from")}</span>{" "}
              <span className="font-medium">{from.revision}</span>
            </div>

            <div>
              <span className="text-muted-foreground">{t("processVariants.compare.to")}</span>{" "}
              <span className="font-medium">{to.revision}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("processVariants.compare.technical")}</CardTitle>
        </CardHeader>

        <CardContent>
          {technical.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>{t("processVariants.compare.empty")}</EmptyTitle>

                <EmptyDescription>
                  {t("processVariants.compare.empty.description")}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("processVariants.compare.columns.category")}</TableHead>

                  <TableHead>{t("processVariants.compare.columns.type")}</TableHead>

                  <TableHead>{t("processVariants.compare.columns.record")}</TableHead>

                  <TableHead>{t("processVariants.compare.columns.fields")}</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {technical.map((change) => (
                  <TableRow key={`${change.category}-${change.logicalId}`}>
                    <TableCell>
                      {t(`processVariants.compare.categories.${change.category}`)}
                    </TableCell>

                    <TableCell>
                      <Badge variant={typeVariant(change.type)}>
                        {t(`processVariants.compare.types.${change.type}`)}
                      </Badge>
                    </TableCell>

                    <TableCell className="font-medium">{change.label}</TableCell>

                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {change.fields.length > 0 ? change.fields.join(", ") : "-"}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {layout.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("processVariants.compare.layout")}</CardTitle>
          </CardHeader>

          <CardContent>
            <p className="mb-4 text-sm text-muted-foreground">
              {t("processVariants.compare.layout.description")}
            </p>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("processVariants.compare.columns.category")}</TableHead>

                  <TableHead>{t("processVariants.compare.columns.record")}</TableHead>

                  <TableHead>{t("processVariants.compare.columns.fields")}</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {layout.map((change) => (
                  <TableRow key={`${change.category}-${change.logicalId}`}>
                    <TableCell>
                      {t(`processVariants.compare.categories.${change.category}`)}
                    </TableCell>

                    <TableCell className="font-medium">{change.label}</TableCell>

                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {change.fields.length > 0 ? change.fields.join(", ") : "-"}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
