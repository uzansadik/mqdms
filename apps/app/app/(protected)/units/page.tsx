import { getTranslations } from "@mqdms/i18n/server";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@mqdms/ui/components/table";

import { requireAuthContext } from "@/features/auth/session";
import { StatusBadge } from "@/features/shared/status-badge";
import { UnitForm } from "@/features/units/components/unit-form";
import { listUnits } from "@/features/units/repository";

/**
 * Birim listesi ve yeni birim formu.
 *
 * Birimler item kütüphanesinin parçasıdır: ERP'den gelen birim kodları
 * mQDMS birimlerine eşleştirilir.
 */
export default async function UnitsPage() {
  const context = await requireAuthContext();

  const t = await getTranslations();

  const units = await listUnits(context.organizationId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("units.title")}</h1>

        <p className="mt-1 text-sm text-muted-foreground">{t("units.description")}</p>
      </div>

      <div className="max-w-3xl">
        <UnitForm />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("units.list.columns.code")}</TableHead>

            <TableHead>{t("units.list.columns.name")}</TableHead>

            <TableHead>{t("units.list.columns.dimension")}</TableHead>

            <TableHead>{t("units.list.columns.decimalPlaces")}</TableHead>

            <TableHead>{t("units.list.columns.conversionFactor")}</TableHead>

            <TableHead>{t("units.list.columns.status")}</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {units.map((unit) => (
            <TableRow key={unit.id}>
              <TableCell className="font-medium">{unit.code}</TableCell>

              <TableCell>{unit.name}</TableCell>

              <TableCell>{t(`units.dimension.${unit.dimension}`)}</TableCell>

              <TableCell>{unit.decimalPlaces}</TableCell>

              <TableCell>
                {unit.conversionFactor === null ? t("units.list.baseUnit") : unit.conversionFactor}
              </TableCell>

              <TableCell>
                <StatusBadge label={t(`items.status.${unit.status}`)} status={unit.status} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
