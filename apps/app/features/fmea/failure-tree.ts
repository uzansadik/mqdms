import {
  type ActionPriority,
  type ActionPriorityRow,
  computeActionPriority,
  computeRiskClass,
  type RiskClass,
  type RiskClassRow,
} from "./rating";
import type {
  FmeaActionRecord,
  FmeaControlRecord,
  FmeaFailureCauseRecord,
  FmeaFailureModeRecord,
  FmeaFunctionRecord,
  FmeaStructureElementRecord,
} from "./repository";
import type { FmeaCauseCategory, FmeaSeverityClassification } from "./schema";

/**
 * Hata analizi ağacı.
 *
 * AIAG–VDA çalışma sayfasının satır grain'i **hata nedenidir**; element,
 * fonksiyon ve hata modu satırları üst satırdan miras alınır. Bu model
 * saf olduğu için hem sunucuda hem istemcide aynı ağaç üretilir.
 */

/** Grid'de gösterilen tek satır. */
export type FailureTreeRow = {
  id: string;
  parentId: string | null;

  /** Satırın seviyesi. */
  kind: "element" | "function" | "mode" | "cause";

  /** Satırın bağlı olduğu yapı elemanının kimliği. */
  elementId: string;

  elementCode: string;
  elementName: string;

  functionName: string | null;

  mode: string | null;
  effectLocal: string | null;
  effectEnd: string | null;
  severity: number | null;
  classification: FmeaSeverityClassification | null;

  cause: string | null;
  causeCategory: FmeaCauseCategory | null;
  occurrence: number | null;
  detection: number | null;

  prevention: string | null;
  detectionControl: string | null;

  /** Hesaplanan değerler; yalnızca neden satırında anlamlıdır. */
  actionPriority: ActionPriority | null;
  riskClass: RiskClass | null;
  specialAction: boolean;

  /** Nedenin bağlı olduğu aksiyon sayısı. */
  actionCount: number;
};

/** Ağacı kurmak için gereken girdiler. */
export type FailureTreeInput = {
  structureElements: readonly FmeaStructureElementRecord[];
  functions: readonly FmeaFunctionRecord[];
  failureModes: readonly FmeaFailureModeRecord[];
  failureCauses: readonly FmeaFailureCauseRecord[];
  controls: readonly FmeaControlRecord[];
  actions: readonly FmeaActionRecord[];
  actionPriorityMatrix: readonly ActionPriorityRow[];
  riskClassMatrix: readonly RiskClassRow[];
};

/**
 * Hata analizi ağacını kurar.
 *
 * Element → fonksiyon → hata modu → hata nedeni sırası korunur. Bir hata
 * modu fonksiyona bağlı değilse doğrudan elementin altında görünür.
 */
export function buildFailureTree(input: FailureTreeInput): {
  roots: FailureTreeRow[];
  childrenOf: Map<string, FailureTreeRow[]>;
} {
  const childrenOf = new Map<string, FailureTreeRow[]>();
  const roots: FailureTreeRow[] = [];

  const addChild = (parentId: string, row: FailureTreeRow) => {
    const list = childrenOf.get(parentId) ?? [];

    list.push(row);
    childrenOf.set(parentId, list);
  };

  const controlsByCause = new Map<string, FmeaControlRecord[]>();

  for (const control of input.controls) {
    const list = controlsByCause.get(control.failureCauseId) ?? [];

    list.push(control);
    controlsByCause.set(control.failureCauseId, list);
  }

  const actionsByCause = new Map<string, number>();

  for (const action of input.actions) {
    if (!action.failureCauseId) {
      continue;
    }

    actionsByCause.set(action.failureCauseId, (actionsByCause.get(action.failureCauseId) ?? 0) + 1);
  }

  const functionsByElement = new Map<string, FmeaFunctionRecord[]>();

  for (const fn of input.functions) {
    if (!fn.structureElementId) {
      continue;
    }

    const list = functionsByElement.get(fn.structureElementId) ?? [];

    list.push(fn);
    functionsByElement.set(fn.structureElementId, list);
  }

  const modesByFunction = new Map<string, FmeaFailureModeRecord[]>();

  for (const mode of input.failureModes) {
    if (!mode.functionId) {
      continue;
    }

    const list = modesByFunction.get(mode.functionId) ?? [];

    list.push(mode);
    modesByFunction.set(mode.functionId, list);
  }

  const modesByElement = new Map<string, FmeaFailureModeRecord[]>();

  for (const mode of input.failureModes) {
    if (mode.functionId) {
      continue;
    }

    const list = modesByElement.get(mode.structureElementId) ?? [];

    list.push(mode);
    modesByElement.set(mode.structureElementId, list);
  }

  const causesByMode = new Map<string, FmeaFailureCauseRecord[]>();

  for (const cause of input.failureCauses) {
    const list = causesByMode.get(cause.failureModeId) ?? [];

    list.push(cause);
    causesByMode.set(cause.failureModeId, list);
  }

  const buildCauseRow = (
    cause: FmeaFailureCauseRecord,
    mode: FmeaFailureModeRecord,
    element: FmeaStructureElementRecord,
    functionName: string | null,
  ): FailureTreeRow => {
    const controls = controlsByCause.get(cause.id) ?? [];

    const prevention = controls.find((control) => control.controlType === "PREVENTION");
    const detectionControl = controls.find((control) => control.controlType === "DETECTION");

    const actionPriority = computeActionPriority(
      mode.severity as never,
      cause.occurrence as never,
      cause.detection as never,
      input.actionPriorityMatrix,
    );

    const riskClass = computeRiskClass(
      mode.severity as never,
      cause.occurrence as never,
      input.riskClassMatrix,
    );

    return {
      id: cause.id,
      parentId: mode.id,
      kind: "cause",
      elementId: element.id,
      elementCode: element.code,
      elementName: element.name,
      functionName,
      mode: mode.failureMode,
      effectLocal: mode.failureEffectLocal,
      effectEnd: mode.failureEffectEnd,
      severity: mode.severity,
      classification: mode.severityClassification,
      cause: cause.cause,
      causeCategory: cause.causeCategory,
      occurrence: cause.occurrence,
      detection: cause.detection,
      prevention: prevention?.description ?? null,
      detectionControl: detectionControl?.description ?? null,
      actionPriority,
      riskClass,
      specialAction: actionPriority === "H",
      actionCount: actionsByCause.get(cause.id) ?? 0,
    };
  };

  for (const element of input.structureElements) {
    const elementRow: FailureTreeRow = {
      id: element.id,
      parentId: element.parentId,
      kind: "element",
      elementId: element.id,
      elementCode: element.code,
      elementName: element.name,
      functionName: null,
      mode: null,
      effectLocal: null,
      effectEnd: null,
      severity: null,
      classification: null,
      cause: null,
      causeCategory: null,
      occurrence: null,
      detection: null,
      prevention: null,
      detectionControl: null,
      actionPriority: null,
      riskClass: null,
      specialAction: false,
      actionCount: 0,
    };

    if (!element.parentId) {
      roots.push(elementRow);
    } else {
      addChild(element.parentId, elementRow);
    }

    for (const fn of functionsByElement.get(element.id) ?? []) {
      const functionRow: FailureTreeRow = {
        ...elementRow,
        id: fn.id,
        parentId: element.id,
        kind: "function",
        functionName: fn.name,
      };

      addChild(element.id, functionRow);

      for (const mode of modesByFunction.get(fn.id) ?? []) {
        const modeRow: FailureTreeRow = {
          ...functionRow,
          id: mode.id,
          parentId: fn.id,
          kind: "mode",
          functionName: fn.name,
          mode: mode.failureMode,
          effectLocal: mode.failureEffectLocal,
          effectEnd: mode.failureEffectEnd,
          severity: mode.severity,
          classification: mode.severityClassification,
        };

        addChild(fn.id, modeRow);

        for (const cause of causesByMode.get(mode.id) ?? []) {
          addChild(mode.id, buildCauseRow(cause, mode, element, fn.name));
        }
      }
    }

    for (const mode of modesByElement.get(element.id) ?? []) {
      const modeRow: FailureTreeRow = {
        ...elementRow,
        id: mode.id,
        parentId: element.id,
        kind: "mode",
        mode: mode.failureMode,
        effectLocal: mode.failureEffectLocal,
        effectEnd: mode.failureEffectEnd,
        severity: mode.severity,
        classification: mode.severityClassification,
      };

      addChild(element.id, modeRow);

      for (const cause of causesByMode.get(mode.id) ?? []) {
        addChild(mode.id, buildCauseRow(cause, mode, element, null));
      }
    }
  }

  return { roots, childrenOf };
}

/**
 * Ağacı düz satır listesine çevirir.
 *
 * Sıra derinlik önceliklidir: üst satır altından önce gelir. Grid bileşeni
 * bu listeyi alır ve ağacı yeniden kurar.
 */
export function flattenFailureTree(tree: {
  roots: FailureTreeRow[];
  childrenOf: Map<string, FailureTreeRow[]>;
}): FailureTreeRow[] {
  const rows: FailureTreeRow[] = [];

  const walk = (row: FailureTreeRow) => {
    rows.push(row);

    for (const child of tree.childrenOf.get(row.id) ?? []) {
      walk(child);
    }
  };

  for (const root of tree.roots) {
    walk(root);
  }

  return rows;
}
