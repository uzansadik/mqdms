import { describe, expect, it } from "vitest";

import { buildFailureTree, flattenFailureTree } from "./failure-tree";
import { DEFAULT_ACTION_PRIORITY_MATRIX, DEFAULT_RISK_CLASS_MATRIX } from "./rating";
import type {
  FmeaControlRecord,
  FmeaFailureCauseRecord,
  FmeaFailureModeRecord,
  FmeaFunctionRecord,
  FmeaStructureElementRecord,
} from "./repository";

/**
 * Test verisi.
 *
 * Yapı: sistem → bileşen; bileşenin bir fonksiyonu ve bir fonksiyonsuz hata
 * modu var; hata modunun bir nedeni ve o nedenin bir önleme kontrolü ile
 * bir algılama kontrolü var.
 */
const structureElements: FmeaStructureElementRecord[] = [
  {
    id: "el-1",
    organizationId: "org-1",
    fmeaDocumentId: "doc-1",
    parentId: null,
    level: "SYSTEM",
    code: "SYS",
    name: "Sistem",
    description: null,
    flowNodeId: null,
    itemId: null,
    processWorkElementId: null,
    isSpecialCharacteristic: false,
    sortOrder: 0,
  },
  {
    id: "el-2",
    organizationId: "org-1",
    fmeaDocumentId: "doc-1",
    parentId: "el-1",
    level: "COMPONENT",
    code: "CMP",
    name: "Bileşen",
    description: null,
    flowNodeId: null,
    itemId: null,
    processWorkElementId: null,
    isSpecialCharacteristic: false,
    sortOrder: 1,
  },
];

const functions: FmeaFunctionRecord[] = [
  {
    id: "fn-1",
    organizationId: "org-1",
    fmeaDocumentId: "doc-1",
    structureElementId: "el-2",
    processFunctionId: null,
    name: "Fonksiyon",
    description: null,
    functionAspect: "PURPOSE",
    requirementText: null,
    isSpecialCharacteristic: false,
    sortOrder: 0,
  },
];

const failureModes: FmeaFailureModeRecord[] = [
  {
    id: "fm-1",
    organizationId: "org-1",
    fmeaDocumentId: "doc-1",
    structureElementId: "el-2",
    functionId: "fn-1",
    failureMode: "Hata modu",
    failureEffectLocal: null,
    failureEffectEnd: null,
    severity: 9,
    severityClassification: "SC2",
    sortOrder: 0,
  },
  {
    id: "fm-2",
    organizationId: "org-1",
    fmeaDocumentId: "doc-1",
    structureElementId: "el-2",
    functionId: null,
    failureMode: "Fonksiyonsuz mod",
    failureEffectLocal: null,
    failureEffectEnd: null,
    severity: 4,
    severityClassification: "NONE",
    sortOrder: 1,
  },
];

const failureCauses: FmeaFailureCauseRecord[] = [
  {
    id: "fc-1",
    organizationId: "org-1",
    fmeaDocumentId: "doc-1",
    failureModeId: "fm-1",
    cause: "Neden",
    causeCategory: "MAN",
    processWorkElementId: null,
    processFunctionId: null,
    occurrence: 5,
    detection: 5,
    sortOrder: 0,
  },
];

const controls: FmeaControlRecord[] = [
  {
    id: "ct-1",
    organizationId: "org-1",
    fmeaDocumentId: "doc-1",
    failureCauseId: "fc-1",
    controlType: "PREVENTION",
    description: "Önleme",
    effectiveness: "GOOD",
    processFunctionId: null,
    sortOrder: 0,
  },
  {
    id: "ct-2",
    organizationId: "org-1",
    fmeaDocumentId: "doc-1",
    failureCauseId: "fc-1",
    controlType: "DETECTION",
    description: "Algılama",
    effectiveness: "MODERATE",
    processFunctionId: null,
    sortOrder: 1,
  },
];

function build() {
  return buildFailureTree({
    structureElements,
    functions,
    failureModes,
    failureCauses,
    controls,
    actions: [],
    actionPriorityMatrix: DEFAULT_ACTION_PRIORITY_MATRIX,
    riskClassMatrix: DEFAULT_RISK_CLASS_MATRIX,
  });
}

describe("hata analizi ağacı", () => {
  it("kök satır elementtir", () => {
    const tree = build();

    expect(tree.roots).toHaveLength(1);
    expect(tree.roots[0]?.kind).toBe("element");
  });

  it("fonksiyonlar elementin altında yer alır", () => {
    const tree = build();

    const children = tree.childrenOf.get("el-2") ?? [];

    expect(children.map((row) => row.kind)).toEqual(["function", "mode"]);
  });

  it("fonksiyona bağlı mod fonksiyonun altında yer alır", () => {
    const tree = build();

    const functionChildren = tree.childrenOf.get("fn-1") ?? [];

    expect(functionChildren).toHaveLength(1);
    expect(functionChildren[0]?.id).toBe("fm-1");
  });

  it("nedenler hata modunun altında yer alır", () => {
    const tree = build();

    const causeChildren = tree.childrenOf.get("fm-1") ?? [];

    expect(causeChildren).toHaveLength(1);
    expect(causeChildren[0]?.kind).toBe("cause");
  });

  it("her satır kendi ebeveynine bağlanır", () => {
    const tree = build();

    for (const row of flattenFailureTree(tree)) {
      if (row.parentId) {
        expect(tree.childrenOf.get(row.parentId)).toBeDefined();
      }
    }
  });

  it("önleme ve algılama kontrolleri nedene bağlanır", () => {
    const tree = build();

    const cause = (tree.childrenOf.get("fm-1") ?? [])[0];

    expect(cause?.prevention).toBe("Önleme");
    expect(cause?.detectionControl).toBe("Algılama");
  });

  it("Action Priority ve risk sınıfı hesaplanır", () => {
    const tree = build();

    const cause = (tree.childrenOf.get("fm-1") ?? [])[0];

    /* S=9, O=5, D=5 → H */
    expect(cause?.actionPriority).toBe("H");
    expect(cause?.specialAction).toBe(true);
    expect(cause?.riskClass).toBe("A");
  });

  it("fonksiyonsuz mod da ağaca eklenir", () => {
    const tree = build();

    const children = tree.childrenOf.get("el-2") ?? [];

    expect(children.some((row) => row.id === "fm-2")).toBe(true);
  });

  it("düz liste üst satırdan başlar", () => {
    const rows = flattenFailureTree(build());

    expect(rows[0]?.kind).toBe("element");
    expect(rows).toHaveLength(6);
  });
});
