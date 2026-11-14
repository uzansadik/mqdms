import { getTranslations } from "@mqdms/i18n/server";
import { importFields, importTypeSchema, requiredImportFields } from "@mqdms/imports/schema";
import ExcelJS from "exceljs";

/**
 * Örnek değerler.
 *
 * Şablonun doldurulma biçimini gösterir; değerler teknik örnektir ve
 * çevirilmez.
 */
const FIELD_EXAMPLES: Record<string, string> = {
  code: "ABC-001",
  name: "Example item",
  itemGroup: "GENEL",
  itemType: "FINISHED_GOOD",
  supplyType: "MANUFACTURED",
  unit: "AD",
  revision: "REV.01",
  erpReference: "ERP-0001",
  itemCode: "ABC-001",
  groupCode: "GENEL",
  customerCode: "CUST-01",
  customerPartNumber: "CP-001",
  customerPartName: "Customer part",
  customerRevision: "REV.01",
  internalRevision: "REV.01",
  parentItemCode: "ABC-001",
  childItemCode: "XYZ-002",
  quantity: "2",
  lineNumber: "10",
  bomRevision: "REV.01",
  parentItemRevision: "REV.01",
  childItemRevision: "REV.01",
};

/**
 * İçe aktarım şablonu.
 *
 * Kullanıcı dolduracağı dosyanın sütun başlıklarını önceden görür: hangi
 * kolonun hangi alana karşılık geldiği ve hangilerinin zorunlu olduğu şablonda
 * yazılıdır.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const typeParam = url.searchParams.get("type") ?? "ITEM";

  const parsed = importTypeSchema.safeParse(typeParam);

  if (!parsed.success) {
    return Response.json({ error: "Unsupported import type." }, { status: 400 });
  }

  const importType = parsed.data;
  const t = await getTranslations();

  const fields = importFields[importType];
  const required = new Set<string>(requiredImportFields[importType]);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "mQDMS";
  workbook.created = new Date();

  /* 1. Sayfa: doldurulacak şablon. */
  const sheet = workbook.addWorksheet(t("imports.template.sheetName"));

  sheet.columns = fields.map((field) => ({
    header: t(`imports.fields.${field}`),
    key: field,
    width: 22,
  }));

  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).height = 22;

  /* Zorunlu alanlar başlıkta işaretlenir. */
  sheet.getRow(1).eachCell((cell, index) => {
    if (required.has(fields[index - 1] ?? "")) {
      cell.font = { bold: true, color: { argb: "FFB91C1C" } };
    }
  });

  /*
   * Örnek satır: kullanıcı beklenen biçimi görür. Örnek olduğu belirtilir.
   */
  const example = sheet.addRow(
    Object.fromEntries(fields.map((field) => [field, FIELD_EXAMPLES[field] ?? ""])),
  );

  example.font = { italic: true, color: { argb: "FF64748B" } };

  sheet.views = [{ state: "frozen", ySplit: 1 }];

  /* 2. Sayfa: alan açıklamaları ve eşleştirme ipuçları. */
  const help = workbook.addWorksheet(t("imports.template.helpSheetName"));

  help.columns = [
    { header: t("imports.template.help.field"), key: "field", width: 26 },
    { header: t("imports.template.help.technical"), key: "technical", width: 24 },
    { header: t("imports.template.help.required"), key: "required", width: 14 },
  ];

  help.getRow(1).font = { bold: true };

  for (const field of fields) {
    help.addRow({
      field: t(`imports.fields.${field}`),
      technical: field,
      required: required.has(field) ? t("common.yes") : t("common.no"),
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();

  return new Response(buffer as ArrayBuffer, {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename="${t(`imports.template.fileName.${importType}`)}"`,
    },
  });
}
