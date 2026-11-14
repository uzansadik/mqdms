/**
 * İçe aktarım paketi.
 *
 * Bu paket web uygulaması ile worker arasında paylaşılır: dosya ayrıştırma,
 * doğrulama, çakışma çözümü ve yazma adımları hem request kapsamında hem de
 * kuyruk işi içinde çalışabilir.
 */

export {
  findUndecidedConflicts,
  needsInvalidRowDecision,
  selectApplicableRows,
  selectConflictRows,
  selectInvalidRows,
} from "./conflicts";
export { normalizeHeader, suggestMapping } from "./mapping";
export { detectDelimiter, type ImportSheet, parseCsv, parseCsvRows, parseXlsx } from "./parser";
export {
  createImportJob as createImportJobRecord,
  getImportJob,
  type ImportJobErrorRecord,
  type ImportJobRecord,
  listImportJobErrors,
  listImportJobs,
  replaceImportJobErrors,
  updateImportJob,
} from "./repository";
export {
  type ConflictResolution,
  columnMappingSchema,
  conflictResolutionSchema,
  type ImportField,
  type ImportRowDecision,
  type RequiredImportField,
  type ImportType,
  importExecuteSchema,
  importFields,
  importResolveSchema,
  requiredImportFields,
  importRowDecisionSchema,
  importRowErrorSchema,
  importRowStatusSchema,
  importTypeSchema,
  importUploadSchema,
  importValidateSchema,
  isKnownImportField,
} from "./schema";
export {
  createImportJob,
  executeImportJob,
  getImportPreview,
  hashFile,
  ImportRuleError,
  readSheet,
  resolveImportJob,
  validateImportJob,
} from "./service";
export type { ImportPreview, ImportRowResult } from "./types";
export { validateImportRows } from "./validator";
