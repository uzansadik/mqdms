import { relations } from "drizzle-orm";

import { processVariantRevision } from "../mes/process-variant-revision";
import { fmeaAction } from "./fmea-action";
import { fmeaControl } from "./fmea-control";
import { fmeaDocument } from "./fmea-document";
import { fmeaFailureCause, fmeaFailureMode } from "./fmea-failure";
import { fmeaFunction } from "./fmea-function";
import { fmeaSpecialCharacteristic } from "./fmea-special-characteristic";
import { fmeaStructureElement } from "./fmea-structure";

/**
 * FMEA alanının ilişki tanımları.
 *
 * Tablolar dosyalara bölünmüştür; ilişkiler tek bir dosyada toplanır.
 * Böylece tablolar arasında döngüsel import oluşmaz: tablo dosyaları
 * ilişki dosyasını bilmez.
 */

export const fmeaDocumentRelations = relations(fmeaDocument, ({ one, many }) => ({
  processVariantRevision: one(processVariantRevision, {
    fields: [fmeaDocument.processVariantRevisionId],
    references: [processVariantRevision.id],
  }),

  structureElements: many(fmeaStructureElement),

  functions: many(fmeaFunction),

  failureModes: many(fmeaFailureMode),

  failureCauses: many(fmeaFailureCause),

  controls: many(fmeaControl),

  actions: many(fmeaAction),

  specialCharacteristics: many(fmeaSpecialCharacteristic),
}));

export const fmeaStructureElementRelations = relations(fmeaStructureElement, ({ one, many }) => ({
  document: one(fmeaDocument, {
    fields: [fmeaStructureElement.fmeaDocumentId],
    references: [fmeaDocument.id],
  }),

  parent: one(fmeaStructureElement, {
    fields: [fmeaStructureElement.parentId],
    references: [fmeaStructureElement.id],
    relationName: "fmeaStructureElementParent",
  }),

  children: many(fmeaStructureElement, { relationName: "fmeaStructureElementParent" }),

  functions: many(fmeaFunction),

  failureModes: many(fmeaFailureMode),
}));

export const fmeaFunctionRelations = relations(fmeaFunction, ({ one, many }) => ({
  document: one(fmeaDocument, {
    fields: [fmeaFunction.fmeaDocumentId],
    references: [fmeaDocument.id],
  }),

  structureElement: one(fmeaStructureElement, {
    fields: [fmeaFunction.structureElementId],
    references: [fmeaStructureElement.id],
  }),

  failureModes: many(fmeaFailureMode),
}));

export const fmeaFailureModeRelations = relations(fmeaFailureMode, ({ one, many }) => ({
  document: one(fmeaDocument, {
    fields: [fmeaFailureMode.fmeaDocumentId],
    references: [fmeaDocument.id],
  }),

  structureElement: one(fmeaStructureElement, {
    fields: [fmeaFailureMode.structureElementId],
    references: [fmeaStructureElement.id],
  }),

  function: one(fmeaFunction, {
    fields: [fmeaFailureMode.functionId],
    references: [fmeaFunction.id],
  }),

  causes: many(fmeaFailureCause),

  actions: many(fmeaAction),
}));

export const fmeaFailureCauseRelations = relations(fmeaFailureCause, ({ one, many }) => ({
  document: one(fmeaDocument, {
    fields: [fmeaFailureCause.fmeaDocumentId],
    references: [fmeaDocument.id],
  }),

  failureMode: one(fmeaFailureMode, {
    fields: [fmeaFailureCause.failureModeId],
    references: [fmeaFailureMode.id],
  }),

  controls: many(fmeaControl),

  actions: many(fmeaAction),
}));

export const fmeaControlRelations = relations(fmeaControl, ({ one }) => ({
  document: one(fmeaDocument, {
    fields: [fmeaControl.fmeaDocumentId],
    references: [fmeaDocument.id],
  }),

  failureCause: one(fmeaFailureCause, {
    fields: [fmeaControl.failureCauseId],
    references: [fmeaFailureCause.id],
  }),
}));

export const fmeaActionRelations = relations(fmeaAction, ({ one }) => ({
  document: one(fmeaDocument, {
    fields: [fmeaAction.fmeaDocumentId],
    references: [fmeaDocument.id],
  }),

  failureMode: one(fmeaFailureMode, {
    fields: [fmeaAction.failureModeId],
    references: [fmeaFailureMode.id],
    relationName: "fmeaActionFailureMode",
  }),

  failureCause: one(fmeaFailureCause, {
    fields: [fmeaAction.failureCauseId],
    references: [fmeaFailureCause.id],
    relationName: "fmeaActionFailureCause",
  }),
}));

export const fmeaSpecialCharacteristicRelations = relations(
  fmeaSpecialCharacteristic,
  ({ one }) => ({
    document: one(fmeaDocument, {
      fields: [fmeaSpecialCharacteristic.fmeaDocumentId],
      references: [fmeaDocument.id],
    }),

    structureElement: one(fmeaStructureElement, {
      fields: [fmeaSpecialCharacteristic.structureElementId],
      references: [fmeaStructureElement.id],
    }),

    function: one(fmeaFunction, {
      fields: [fmeaSpecialCharacteristic.functionId],
      references: [fmeaFunction.id],
    }),

    failureMode: one(fmeaFailureMode, {
      fields: [fmeaSpecialCharacteristic.failureModeId],
      references: [fmeaFailureMode.id],
    }),
  }),
);
