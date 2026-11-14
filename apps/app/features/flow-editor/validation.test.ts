import { describe, expect, it } from "vitest";

import {
  describeValidationCode,
  GRAPH_ERRORS,
  GRAPH_WARNINGS,
  type GraphEdge,
  type GraphNode,
  validateGraph,
} from "./validation";

/** Test node'u. */
function node(id: string, nodeType: GraphNode["nodeType"] = "ACTIVITY", title = id): GraphNode {
  return { id, nodeType, title, logicalId: id };
}

/** Test edge'i. */
function edge(
  id: string,
  sourceNodeId: string,
  targetNodeId: string,
  edgeType: GraphEdge["edgeType"] = "DEFAULT",
  label: string | null = null,
): GraphEdge {
  return { id, sourceNodeId, targetNodeId, label, edgeType };
}

describe("flow grafiği doğrulaması", () => {
  it("başlangıç ve bitiş noktası olmayan grafiği hata olarak raporlar", () => {
    const result = validateGraph([node("N1")], []);

    expect(result.errors).toContain(GRAPH_ERRORS.NO_START);
    expect(result.errors).toContain(GRAPH_ERRORS.NO_END);
  });

  it("birden fazla başlangıç noktasını hata olarak raporlar", () => {
    const result = validateGraph([node("S1", "START"), node("S2", "START"), node("E1", "END")], []);

    expect(result.errors).toContain(GRAPH_ERRORS.MULTIPLE_START);
  });

  it("başka node'a bağlanan edge'i hata olarak raporlar", () => {
    const result = validateGraph(
      [node("S1", "START"), node("E1", "END")],
      [edge("E-1", "S1", "YOK")],
    );

    expect(result.errors.some((error) => error.startsWith(GRAPH_ERRORS.DANGLING_EDGE))).toBe(true);
  });

  it("başlığı boş node'u hata olarak raporlar", () => {
    const result = validateGraph(
      [node("S1", "START"), node("E1", "END"), node("N1", "ACTIVITY", "  ")],
      [],
    );

    expect(result.errors.some((error) => error.startsWith(GRAPH_ERRORS.EMPTY_TITLE))).toBe(true);
  });

  it("çıkışı olmayan karar noktasını hata olarak raporlar", () => {
    const result = validateGraph(
      [node("S1", "START"), node("D1", "DECISION"), node("E1", "END")],
      [edge("E-1", "S1", "D1")],
    );

    expect(
      result.errors.some((error) => error.startsWith(GRAPH_ERRORS.DECISION_WITHOUT_OUTGOING)),
    ).toBe(true);
  });

  it("geçerli akışta hata üretmez", () => {
    const result = validateGraph(
      [node("S1", "START"), node("A1"), node("E1", "END")],
      [edge("E-1", "S1", "A1"), edge("E-2", "A1", "E1")],
    );

    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  it("rework döngüsünü hata olarak görmez", () => {
    const result = validateGraph(
      [node("S1", "START"), node("M1"), node("E1", "END")],
      [edge("E-1", "S1", "M1"), edge("E-2", "M1", "E1"), edge("E-3", "M1", "M1", "REWORK")],
    );

    expect(result.errors).toEqual([]);
  });

  it("ulaşılamayan node'u uyarı olarak raporlar", () => {
    const result = validateGraph(
      [node("S1", "START"), node("E1", "END"), node("YALNIZ", "ACTIVITY")],
      [edge("E-1", "S1", "E1")],
    );

    expect(
      result.warnings.some((warning) => warning.startsWith(GRAPH_WARNINGS.UNREACHABLE_NODE)),
    ).toBe(true);
  });

  it("bitiş noktasına ulaşamayan node'u uyarı olarak raporlar", () => {
    const result = validateGraph(
      [node("S1", "START"), node("E1", "END"), node("KOPUK", "ACTIVITY")],
      [edge("E-1", "S1", "E1"), edge("E-2", "S1", "KOPUK")],
    );

    expect(
      result.warnings.some((warning) => warning.startsWith(GRAPH_WARNINGS.NODE_WITHOUT_END)),
    ).toBe(true);
  });

  it("koşulsuz karar noktasını uyarı olarak raporlar", () => {
    const result = validateGraph(
      [node("S1", "START"), node("D1", "DECISION"), node("E1", "END")],
      [edge("E-1", "S1", "D1"), edge("E-2", "D1", "E1")],
    );

    expect(
      result.warnings.some((warning) => warning.startsWith(GRAPH_WARNINGS.DECISION_WITHOUT_LABEL)),
    ).toBe(true);
  });

  it("koşullu karar noktasında uyarı üretmez", () => {
    const result = validateGraph(
      [node("S1", "START"), node("D1", "DECISION"), node("E1", "END")],
      [
        edge("E-1", "S1", "D1"),
        edge("E-2", "D1", "E1", "YES", "Uygun"),
        edge("E-3", "D1", "E1", "NO", "Uygun değil"),
      ],
    );

    expect(
      result.warnings.some((warning) => warning.startsWith(GRAPH_WARNINGS.DECISION_WITHOUT_LABEL)),
    ).toBe(false);
  });
});

describe("describeValidationCode", () => {
  /** Test çevirisi. */
  const t = ((key: string) => key) as Parameters<typeof describeValidationCode>[1];

  it("bilinen hatayı okunur mesaja çevirir", () => {
    const message = describeValidationCode(GRAPH_ERRORS.NO_START, t);

    expect(message).toBe("flow.validation.noStart");
  });

  it("kayıt etiketini mesaja ekler", () => {
    const message = describeValidationCode(`${GRAPH_ERRORS.EMPTY_TITLE}:Sertifika kontrolü`, t);

    expect(message).toBe("flow.validation.emptyTitle (Sertifika kontrolü)");
  });

  it("etiket içeren kaydı korur", () => {
    const message = describeValidationCode(`${GRAPH_ERRORS.EMPTY_TITLE}:Sertifika: kontrolü`, t);

    expect(message).toBe("flow.validation.emptyTitle (Sertifika: kontrolü)");
  });
});
