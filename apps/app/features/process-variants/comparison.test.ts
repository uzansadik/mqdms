import { describe, expect, it } from "vitest";

import {
  compareRevisions,
  layoutChanges,
  type RevisionSnapshot,
  technicalChanges,
} from "./comparison";

/** Boş bir revision içeriği. */
function snapshot(overrides: Partial<RevisionSnapshot> = {}): RevisionSnapshot {
  return {
    nodes: [],
    edges: [],
    workElements: [],
    functions: [],
    requirements: [],
    io: [],
    applicabilities: [],
    ...overrides,
  };
}

describe("revision karşılaştırması", () => {
  it("eklenen node'u raporlar", () => {
    const changes = compareRevisions(
      snapshot(),
      snapshot({
        nodes: [
          {
            logicalId: "N1",
            nodeType: "ACTIVITY",
            title: "Kontrol",
            description: null,
            positionX: 0,
            positionY: 0,
          },
        ],
      }),
    );

    expect(changes).toHaveLength(1);
    expect(changes[0]?.type).toBe("ADDED");
    expect(changes[0]?.category).toBe("FLOW");
  });

  it("silinen node'u raporlar", () => {
    const before = snapshot({
      nodes: [
        {
          logicalId: "N1",
          nodeType: "ACTIVITY",
          title: "Kontrol",
          description: null,
          positionX: 0,
          positionY: 0,
        },
      ],
    });

    const changes = compareRevisions(before, snapshot());

    expect(changes).toHaveLength(1);
    expect(changes[0]?.type).toBe("REMOVED");
  });

  it("başlığı değişen node'u teknik değişiklik olarak raporlar", () => {
    const node = {
      logicalId: "N1",
      nodeType: "ACTIVITY",
      title: "Kontrol",
      description: null,
      positionX: 0,
      positionY: 0,
    };

    const changes = compareRevisions(
      snapshot({ nodes: [node] }),
      snapshot({ nodes: [{ ...node, title: "Kontrol 2" }] }),
    );

    expect(changes[0]?.type).toBe("UPDATED");
    expect(changes[0]?.layoutOnly).toBe(false);
    expect(changes[0]?.fields).toContain("title");
  });

  it("yalnızca konumu değişen node'u layout değişikliği olarak raporlar", () => {
    const node = {
      logicalId: "N1",
      nodeType: "ACTIVITY",
      title: "Kontrol",
      description: null,
      positionX: 0,
      positionY: 0,
    };

    const changes = compareRevisions(
      snapshot({ nodes: [node] }),
      snapshot({ nodes: [{ ...node, positionX: 120 }] }),
    );

    expect(changes[0]?.layoutOnly).toBe(true);
    expect(layoutChanges(changes)).toHaveLength(1);
    expect(technicalChanges(changes)).toHaveLength(0);
  });

  it("mantıksal kimliği koruyan node'u eşleştirir", () => {
    const changes = compareRevisions(
      snapshot({
        nodes: [
          {
            logicalId: "N1",
            nodeType: "ACTIVITY",
            title: "Eski ad",
            description: null,
            positionX: 0,
            positionY: 0,
          },
        ],
      }),
      snapshot({
        nodes: [
          {
            logicalId: "N1",
            nodeType: "ACTIVITY",
            title: "Yeni ad",
            description: null,
            positionX: 0,
            positionY: 0,
          },
        ],
      }),
    );

    expect(changes).toHaveLength(1);
    expect(changes[0]?.type).toBe("UPDATED");
  });

  it("edge değişikliklerini raporlar", () => {
    const changes = compareRevisions(
      snapshot(),
      snapshot({
        edges: [
          {
            logicalId: "E1",
            sourceLogicalId: "N1",
            targetLogicalId: "N2",
            label: "OK",
            condition: null,
            edgeType: "OK",
          },
        ],
      }),
    );

    expect(changes[0]?.category).toBe("FLOW");
    expect(changes[0]?.type).toBe("ADDED");
  });

  it("gereklilik ve fonksiyon değişikliklerini raporlar", () => {
    const changes = compareRevisions(
      snapshot(),
      snapshot({
        requirements: [
          {
            logicalId: "R1",
            code: "REQ-1",
            name: "Ölçü uygunluğu",
            description: null,
            requirementType: "PROCESS",
            sourceReference: null,
            isMandatory: true,
          },
        ],
        functions: [
          {
            logicalId: "F1",
            name: "Ölçmek",
            description: null,
            functionScope: "PROCESS",
          },
        ],
      }),
    );

    expect(changes.map((change) => change.category).sort()).toEqual(["FUNCTION", "REQUIREMENT"]);
  });
});
