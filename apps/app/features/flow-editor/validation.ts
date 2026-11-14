import type { MessageKey } from "@mqdms/i18n";

/**
 * Flow grafiği doğrulaması.
 *
 * Bu modül saf fonksiyonlardan oluşur: grafik kuralları veritabanından
 * bağımsız olarak test edilir.
 */

/** Çeviri fonksiyonu. */
export type ValidatorTranslator = (
  key: MessageKey,
  values?: Record<string, string | number>,
) => string;

/** Node tipleri. */
export type FlowNodeType =
  | "START"
  | "END"
  | "ACTIVITY"
  | "INSPECTION"
  | "DECISION"
  | "STORAGE"
  | "TRANSPORT"
  | "DOCUMENT"
  | "SUBPROCESS"
  | "PROCESS_STEP_REFERENCE"
  | "PROCESS_FLOW_REFERENCE";

/** Edge tipleri. */
export type FlowEdgeType =
  | "DEFAULT"
  | "YES"
  | "NO"
  | "OK"
  | "NOK"
  | "CONDITIONAL"
  | "REWORK"
  | "MATERIAL_FLOW";

/** Doğrulama için node. */
export type GraphNode = {
  id: string;
  nodeType: FlowNodeType;
  title: string;
  logicalId: string;
};

/** Doğrulama için edge. */
export type GraphEdge = {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  label: string | null;
  edgeType: FlowEdgeType;
};

/** Doğrulama sonucu. */
export type GraphValidation = {
  /** Yayınlamayı engelleyen hatalar. */
  errors: string[];

  /** Kullanıcıya gösterilen, yayınlamayı engellemeyen uyarılar. */
  warnings: string[];
};

/** Doğrulama hata ve uyarı kodları. */
export const GRAPH_ERRORS = {
  NO_START: "NO_START",
  MULTIPLE_START: "MULTIPLE_START",
  NO_END: "NO_END",
  DANGLING_EDGE: "DANGLING_EDGE",
  EMPTY_TITLE: "EMPTY_TITLE",
  DECISION_WITHOUT_OUTGOING: "DECISION_WITHOUT_OUTGOING",
} as const;

export const GRAPH_WARNINGS = {
  UNREACHABLE_NODE: "UNREACHABLE_NODE",
  NODE_WITHOUT_END: "NODE_WITHOUT_END",
  DECISION_WITHOUT_LABEL: "DECISION_WITHOUT_LABEL",
  ISOLATED_NODE: "ISOLATED_NODE",
} as const;

/**
 * Bir node'dan başlayıp END node'una ulaşılabilir mi?
 *
 * Kontrollü rework döngüleri geçerlidir; bu yüzden grafik döngüleri hata
 * değildir. Yalnızca geçerli bir bitiş noktasına **ulaşamayan** akışlar
 * uyarı üretir.
 */
function canReachEnd(
  nodeId: string,
  adjacency: Map<string, string[]>,
  endNodeIds: Set<string>,
): boolean {
  const visited = new Set<string>();
  const stack = [nodeId];

  while (stack.length > 0) {
    const current = stack.pop();

    if (!current || visited.has(current)) {
      continue;
    }

    visited.add(current);

    if (endNodeIds.has(current)) {
      return true;
    }

    for (const next of adjacency.get(current) ?? []) {
      if (!visited.has(next)) {
        stack.push(next);
      }
    }
  }

  return false;
}

/**
 * Grafiği doğrular.
 *
 * @param nodes akışın node'ları.
 * @param edges akışın edge'leri.
 */
export function validateGraph(nodes: GraphNode[], edges: GraphEdge[]): GraphValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  const nodeIds = new Set(nodes.map((node) => node.id));
  const startNodes = nodes.filter((node) => node.nodeType === "START");
  const endNodes = nodes.filter((node) => node.nodeType === "END");

  if (nodes.length > 0 && startNodes.length === 0) {
    errors.push(GRAPH_ERRORS.NO_START);
  }

  if (startNodes.length > 1) {
    errors.push(GRAPH_ERRORS.MULTIPLE_START);
  }

  if (nodes.length > 0 && endNodes.length === 0) {
    errors.push(GRAPH_ERRORS.NO_END);
  }

  for (const node of nodes) {
    if (node.title.trim() === "") {
      errors.push(`${GRAPH_ERRORS.EMPTY_TITLE}:${node.id}`);
    }
  }

  const adjacency = new Map<string, string[]>();
  const incomingCount = new Map<string, number>();

  for (const node of nodes) {
    adjacency.set(node.id, []);
    incomingCount.set(node.id, 0);
  }

  for (const edge of edges) {
    if (!nodeIds.has(edge.sourceNodeId) || !nodeIds.has(edge.targetNodeId)) {
      errors.push(`${GRAPH_ERRORS.DANGLING_EDGE}:${edge.id}`);
      continue;
    }

    adjacency.get(edge.sourceNodeId)?.push(edge.targetNodeId);
    incomingCount.set(edge.targetNodeId, (incomingCount.get(edge.targetNodeId) ?? 0) + 1);
  }

  for (const node of nodes) {
    const outgoing = edges.filter((edge) => edge.sourceNodeId === node.id);

    if (node.nodeType === "DECISION" && outgoing.length === 0) {
      errors.push(`${GRAPH_ERRORS.DECISION_WITHOUT_OUTGOING}:${node.id}`);
    }

    if (
      node.nodeType === "DECISION" &&
      outgoing.length > 0 &&
      outgoing.every((edge) => (edge.label ?? "").trim() === "")
    ) {
      warnings.push(`${GRAPH_WARNINGS.DECISION_WITHOUT_LABEL}:${node.id}`);
    }

    if (node.nodeType !== "START" && (incomingCount.get(node.id) ?? 0) === 0) {
      warnings.push(`${GRAPH_WARNINGS.UNREACHABLE_NODE}:${node.id}`);
    }

    if (node.nodeType !== "START" && node.nodeType !== "END" && outgoing.length === 0) {
      warnings.push(`${GRAPH_WARNINGS.ISOLATED_NODE}:${node.id}`);
    }
  }

  const endNodeIds = new Set(endNodes.map((node) => node.id));

  if (endNodeIds.size > 0) {
    for (const node of nodes) {
      if (node.nodeType === "END") {
        continue;
      }

      if (!canReachEnd(node.id, adjacency, endNodeIds)) {
        warnings.push(`${GRAPH_WARNINGS.NODE_WITHOUT_END}:${node.id}`);
      }
    }
  }

  return { errors, warnings };
}

/**
 * Tek bir doğrulama hata kodunu okunur mesaja çevirir.
 *
 * Kod `BASE:etiket` biçimindeyse etiket mesaja eklenir: kullanıcı hangi
 * kaydın düzeltilmesi gerektiğini görür.
 */
export function describeValidationCode(code: string, t: ValidatorTranslator): string {
  const [base = code, ...rest] = code.split(":");
  const label = rest.join(":");
  const message = describeValidation({ errors: [base], warnings: [] }, t).errors[0] ?? base;

  return label ? `${message} (${label})` : message;
}

/**
 * Doğrulama hatalarını okunur mesajlara çevirir.
 *
 * Hatalar kullanıcıya gösterilir; uyarılar bilgilendirme amaçlıdır.
 */
export function describeValidation(
  validation: GraphValidation,
  t: ValidatorTranslator,
): { errors: string[]; warnings: string[] } {
  const describe = (code: string): string => {
    const [base, id] = code.split(":");

    switch (base) {
      case GRAPH_ERRORS.NO_START:
        return t("flow.validation.noStart");

      case GRAPH_ERRORS.MULTIPLE_START:
        return t("flow.validation.multipleStart");

      case GRAPH_ERRORS.NO_END:
        return t("flow.validation.noEnd");

      case GRAPH_ERRORS.DANGLING_EDGE:
        return t("flow.validation.danglingEdge");

      case GRAPH_ERRORS.EMPTY_TITLE:
        return t("flow.validation.emptyTitle");

      case GRAPH_ERRORS.DECISION_WITHOUT_OUTGOING:
        return t("flow.validation.decisionWithoutOutgoing");

      case GRAPH_WARNINGS.UNREACHABLE_NODE:
        return t("flow.validation.unreachableNode");

      case GRAPH_WARNINGS.NODE_WITHOUT_END:
        return t("flow.validation.nodeWithoutEnd");

      case GRAPH_WARNINGS.DECISION_WITHOUT_LABEL:
        return t("flow.validation.decisionWithoutLabel");

      case GRAPH_WARNINGS.ISOLATED_NODE:
        return t("flow.validation.isolatedNode");

      default:
        return t("flow.validation.unknown", { id: id ?? base ?? code });
    }
  };

  return {
    errors: validation.errors.map(describe),
    warnings: validation.warnings.map(describe),
  };
}
