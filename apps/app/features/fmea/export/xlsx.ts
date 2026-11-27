import type ExcelJS from "exceljs";

import type { FailureTreeRow } from "../failure-tree";

/**
 * AIAG–VDA FMEA çalışma kitabı üretimi.
 *
 * Kitap beş sayfadan oluşur: Sistem Yapısı, Fonksiyon Analizi, Hata Analizi,
 * Aksiyonlar ve Özel Karakteristikler. Hata Analizi sayfası klasik AIAG–VDA
 * form düzenindedir: her satır bir **hata nedenidir** ve element, fonksiyon
 * ile hata modu üst satırdan tekrarlanır.
 */

/** Dışa aktarılacak belge başlığı. */
export type FmeaExportHeader = {
  code: string;
  name: string;
  fmeaType: string;
  status: string;
  evaluationMethod: string;
  scopeDescription: string | null;
  responsibility: string | null;
  targetDate: string | null;
};

/** Aksiyon satırı (dışa aktarım için sadeleştirilmiş). */
export type FmeaExportAction = {
  failureMode: string | null;
  actionType: string;
  description: string;
  responsible: string | null;
  targetDate: string | null;
  status: string;
  verification: string | null;
  isSpecialAction: boolean;
};

/** Özel karakteristik satırı (dışa aktarım için sadeleştirilmiş). */
export type FmeaExportCharacteristic = {
  target: string;
  characteristicType: string;
  scClass: string | null;
  reason: string | null;
  status: string;
};

/** Sayfa başlıkları. */
export type FmeaExportSheets = {
  structure: string;
  functions: string;
  failures: string;
  actions: string;
  characteristics: string;
};

/** Dışa aktarım girdisi. */
export type FmeaExportInput = {
  header: FmeaExportHeader;
  sheets: FmeaExportSheets;
  structureRows: { code: string; name: string; level: string; special: boolean }[];
  functionRows: { element: string; name: string; aspect: string; requirement: string | null }[];
  failureRows: FailureTreeRow[];
  actions: FmeaExportAction[];
  characteristics: FmeaExportCharacteristic[];
};

/** Sütun başlığı biçimi. */
const HEADER_FILL = "FF1E293B";

/**
 * Çalışma kitabını üretir.
 *
 * ExcelJS yalnızca Node tarafında çalışır; bu yüzden modül sunucu
 * bileşenlerinden import edilir.
 */
export async function buildFmeaWorkbook(input: FmeaExportInput): Promise<ExcelJS.Workbook> {
  const ExcelJS = await import("exceljs");

  const workbook = new ExcelJS.Workbook();

  workbook.creator = "mQDMS";
  workbook.created = new Date();

  addHeaderSheet(workbook, input);
  addStructureSheet(workbook, input);
  addFunctionSheet(workbook, input);
  addFailureSheet(workbook, input);
  addActionSheet(workbook, input);
  addCharacteristicSheet(workbook, input);

  return workbook;
}

/** Belge başlığı sayfası. */
function addHeaderSheet(workbook: ExcelJS.Workbook, input: FmeaExportInput) {
  const sheet = workbook.addWorksheet("FMEA");

  sheet.columns = [
    { header: "Code", key: "code", width: 24 },
    { header: "Name", key: "name", width: 40 },
    { header: "Type", key: "type", width: 12 },
    { header: "Status", key: "status", width: 16 },
    { header: "Evaluation", key: "method", width: 18 },
    { header: "Scope", key: "scope", width: 60 },
    { header: "Responsibility", key: "responsibility", width: 26 },
    { header: "Target date", key: "target", width: 16 },
  ];

  styleHeader(sheet, 1);

  sheet.addRow({
    code: input.header.code,
    name: input.header.name,
    type: input.header.fmeaType,
    status: input.header.status,
    method: input.header.evaluationMethod,
    scope: input.header.scopeDescription ?? "",
    responsibility: input.header.responsibility ?? "",
    target: input.header.targetDate ?? "",
  });
}

/** Sistem yapısı sayfası. */
function addStructureSheet(workbook: ExcelJS.Workbook, input: FmeaExportInput) {
  const sheet = workbook.addWorksheet(input.sheets.structure);

  sheet.columns = [
    { header: "Code", key: "code", width: 24 },
    { header: "Name", key: "name", width: 40 },
    { header: "Level", key: "level", width: 16 },
    { header: "Special characteristic", key: "special", width: 22 },
  ];

  styleHeader(sheet, 1);

  for (const row of input.structureRows) {
    sheet.addRow({
      code: row.code,
      name: row.name,
      level: row.level,
      special: row.special ? "X" : "",
    });
  }
}

/** Fonksiyon analizi sayfası. */
function addFunctionSheet(workbook: ExcelJS.Workbook, input: FmeaExportInput) {
  const sheet = workbook.addWorksheet(input.sheets.functions);

  sheet.columns = [
    { header: "Element", key: "element", width: 30 },
    { header: "Function", key: "name", width: 40 },
    { header: "Aspect", key: "aspect", width: 16 },
    { header: "Requirement", key: "requirement", width: 50 },
  ];

  styleHeader(sheet, 1);

  for (const row of input.functionRows) {
    sheet.addRow({
      element: row.element,
      name: row.name,
      aspect: row.aspect,
      requirement: row.requirement ?? "",
    });
  }
}

/** Hata analizi sayfası — klasik AIAG–VDA form düzeni. */
function addFailureSheet(workbook: ExcelJS.Workbook, input: FmeaExportInput) {
  const sheet = workbook.addWorksheet(input.sheets.failures);

  sheet.columns = [
    { header: "Element", key: "element", width: 30 },
    { header: "Function", key: "function", width: 28 },
    { header: "Failure mode", key: "mode", width: 34 },
    { header: "Failure effect (local)", key: "effectLocal", width: 34 },
    { header: "Failure effect (end)", key: "effectEnd", width: 34 },
    { header: "S", key: "severity", width: 6 },
    { header: "S class", key: "classification", width: 10 },
    { header: "Failure cause", key: "cause", width: 34 },
    { header: "Cause category", key: "causeCategory", width: 18 },
    { header: "O", key: "occurrence", width: 6 },
    { header: "Prevention", key: "prevention", width: 30 },
    { header: "Detection", key: "detectionControl", width: 30 },
    { header: "D", key: "detection", width: 6 },
    { header: "AP", key: "ap", width: 8 },
    { header: "Risk class", key: "riskClass", width: 12 },
    { header: "Special action", key: "specialAction", width: 14 },
    { header: "Actions", key: "actions", width: 10 },
  ];

  styleHeader(sheet, 1);

  for (const row of input.failureRows) {
    sheet.addRow({
      element: `${row.elementCode} ${row.elementName}`,
      function: row.functionName ?? "",
      mode: row.mode ?? "",
      effectLocal: row.effectLocal ?? "",
      effectEnd: row.effectEnd ?? "",
      severity: row.severity ?? "",
      classification: row.classification ?? "",
      cause: row.cause ?? "",
      causeCategory: row.causeCategory ?? "",
      occurrence: row.occurrence ?? "",
      prevention: row.prevention ?? "",
      detectionControl: row.detectionControl ?? "",
      detection: row.detection ?? "",
      ap: row.actionPriority ?? "",
      riskClass: row.riskClass ?? "",
      specialAction: row.specialAction ? "X" : "",
      actions: row.actionCount > 0 ? row.actionCount : "",
    });
  }
}

/** Aksiyonlar sayfası. */
function addActionSheet(workbook: ExcelJS.Workbook, input: FmeaExportInput) {
  const sheet = workbook.addWorksheet(input.sheets.actions);

  sheet.columns = [
    { header: "Failure mode", key: "mode", width: 34 },
    { header: "Action type", key: "type", width: 16 },
    { header: "Action", key: "description", width: 50 },
    { header: "Responsible", key: "responsible", width: 24 },
    { header: "Target date", key: "target", width: 16 },
    { header: "Status", key: "status", width: 16 },
    { header: "Verification", key: "verification", width: 40 },
    { header: "Special action", key: "special", width: 14 },
  ];

  styleHeader(sheet, 1);

  for (const row of input.actions) {
    sheet.addRow({
      mode: row.failureMode ?? "",
      type: row.actionType,
      description: row.description,
      responsible: row.responsible ?? "",
      target: row.targetDate ?? "",
      status: row.status,
      verification: row.verification ?? "",
      special: row.isSpecialAction ? "X" : "",
    });
  }
}

/** Özel karakteristikler sayfası. */
function addCharacteristicSheet(workbook: ExcelJS.Workbook, input: FmeaExportInput) {
  const sheet = workbook.addWorksheet(input.sheets.characteristics);

  sheet.columns = [
    { header: "Target", key: "target", width: 40 },
    { header: "Type", key: "type", width: 16 },
    { header: "Class", key: "class", width: 12 },
    { header: "Reason", key: "reason", width: 50 },
    { header: "Status", key: "status", width: 16 },
  ];

  styleHeader(sheet, 1);

  for (const row of input.characteristics) {
    sheet.addRow({
      target: row.target,
      type: row.characteristicType,
      class: row.scClass ?? "",
      reason: row.reason ?? "",
      status: row.status,
    });
  }
}

/** Başlık satırını biçimlendirir ve satırı dondurur. */
function styleHeader(sheet: ExcelJS.Worksheet, rowNumber: number) {
  const row = sheet.getRow(rowNumber);

  row.font = { bold: true, color: { argb: "FFFFFFFF" } };
  row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
  row.height = 22;

  sheet.views = [{ state: "frozen", ySplit: rowNumber }];
}
