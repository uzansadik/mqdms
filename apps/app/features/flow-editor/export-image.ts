/**
 * Flow grafiğinin görsel çıktısı.
 *
 * Diyagram, müşteri dokümanlarına eklenebilmesi için canvas üzerine çizilir.
 * Çizim, tarayıcı dışında da test edilebilmesi için geometri hesabı saf
 * fonksiyonlardan ayrılmıştır.
 */

/** Dışa aktarılacak node. */
export type ExportNode = {
  id: string;
  title: string;
  nodeType: string;
  positionX: number;
  positionY: number;
  width: number;
  height: number;
};

/** Dışa aktarılacak edge. */
export type ExportEdge = {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  label: string | null;
  edgeType: string;
};

/** Çizim alanının sınırları. */
export type FlowBounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
};

/** Node başına varsayılan ölçüler (piksel). */
export const DEFAULT_NODE_WIDTH = 176;
export const DEFAULT_NODE_HEIGHT = 56;

/** Çizim kenar boşluğu (piksel). */
export const EXPORT_PADDING = 48;

/** Node renkleri. */
export type NodeColor = { fill: string; stroke: string; text: string };

/** Bilinmeyen node türleri için varsayılan renk. */
const DEFAULT_NODE_COLOR: NodeColor = {
  fill: "#f8fafc",
  stroke: "#94a3b8",
  text: "#0f172a",
};

/**
 * Node türüne göre renkler.
 *
 * Editördeki renk mantığıyla aynı: karar ve uç node'ları öne çıkar.
 */
const NODE_COLORS: Record<string, NodeColor> = {
  START: { fill: "#dcfce7", stroke: "#16a34a", text: "#14532d" },
  END: { fill: "#fee2e2", stroke: "#dc2626", text: "#7f1d1d" },
  DECISION: { fill: "#fef3c7", stroke: "#d97706", text: "#78350f" },
  INSPECTION: { fill: "#dbeafe", stroke: "#2563eb", text: "#1e3a8a" },
  STORAGE: { fill: "#ede9fe", stroke: "#7c3aed", text: "#4c1d95" },
  TRANSPORT: { fill: "#cffafe", stroke: "#0891b2", text: "#164e63" },
  DOCUMENT: { fill: "#f1f5f9", stroke: "#64748b", text: "#1e293b" },
  SUBPROCESS: { fill: "#f1f5f9", stroke: "#475569", text: "#0f172a" },
  ACTIVITY: DEFAULT_NODE_COLOR,
};

/** Node türüne göre renk (bilinmeyen türler için ACTIVITY). */
export function nodeColors(nodeType: string): NodeColor {
  return NODE_COLORS[nodeType] ?? DEFAULT_NODE_COLOR;
}

/**
 * Çizim alanının sınırlarını hesaplar.
 *
 * Boş bir akış için sınırlar sıfırdır.
 */
export function computeFlowBounds(nodes: ExportNode[]): FlowBounds {
  if (nodes.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
  }

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const node of nodes) {
    const width = node.width > 0 ? node.width : DEFAULT_NODE_WIDTH;
    const height = node.height > 0 ? node.height : DEFAULT_NODE_HEIGHT;

    minX = Math.min(minX, node.positionX);
    minY = Math.min(minY, node.positionY);
    maxX = Math.max(maxX, node.positionX + width);
    maxY = Math.max(maxY, node.positionY + height);
  }

  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

/**
 * Metni verilen genişliğe göre satırlara böler.
 *
 * Taşan satırlar atılır: son satırda "…" ile kesilir.
 */
export function wrapText(
  measure: (text: string) => number,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const words = text.split(/\s+/).filter((word) => word !== "");

  if (words.length === 0) {
    return [];
  }

  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current === "" ? word : `${current} ${word}`;

    if (measure(candidate) <= maxWidth) {
      current = candidate;

      continue;
    }

    if (current !== "") {
      lines.push(current);
      current = "";
    }

    // Tek kelime bile sığmıyorsa kesilmeden alınır.
    lines.push(word);
    current = "";

    if (lines.length === maxLines) {
      break;
    }
  }

  if (current !== "" && lines.length < maxLines) {
    lines.push(current);
  }

  if (lines.length === maxLines && words.length > lines.join(" ").split(/\s+/).length) {
    const last = lines[maxLines - 1];

    if (last) {
      lines[maxLines - 1] = `${last.slice(0, Math.max(0, last.length - 1))}…`;
    }
  }

  return lines;
}

/** Çizim seçenekleri. */
export type ExportOptions = {
  /** Arka plan rengi. */
  background?: string;

  /** Ölçek (yüksek çözünürlük için 2 kullanılır). */
  scale?: number;

  /** Node başlığının altına node türü yazılır. */
  showNodeType?: boolean;
};

/**
 * Grafiği canvas üzerine çizer.
 *
 * Edge'ler node'ların altında çizilir; oklar hedef node'un sol kenarına
 * gelir. Bu görsel çıktı müşteri dokümanlarına eklenebilir.
 */
export function renderFlowToCanvas(
  canvas: HTMLCanvasElement,
  nodes: ExportNode[],
  edges: ExportEdge[],
  options: ExportOptions = {},
): void {
  const context = canvas.getContext("2d");

  if (!context) {
    return;
  }

  const scale = options.scale ?? 2;
  const background = options.background ?? "#ffffff";
  const showNodeType = options.showNodeType ?? true;

  const bounds = computeFlowBounds(nodes);
  const padding = EXPORT_PADDING;

  const contentWidth = Math.max(bounds.width, 1);
  const contentHeight = Math.max(bounds.height, 1);

  canvas.width = Math.round((contentWidth + padding * 2) * scale);
  canvas.height = Math.round((contentHeight + padding * 2) * scale);

  context.setTransform(scale, 0, 0, scale, 0, 0);
  context.fillStyle = background;
  context.fillRect(0, 0, canvas.width, canvas.height);

  // Koordinatları çizim alanına taşı.
  const offsetX = padding - bounds.minX;
  const offsetY = padding - bounds.minY;

  const nodeById = new Map(nodes.map((node) => [node.id, node]));

  const centerOf = (node: ExportNode) => ({
    x: node.positionX + (node.width > 0 ? node.width : DEFAULT_NODE_WIDTH) / 2 + offsetX,
    y: node.positionY + (node.height > 0 ? node.height : DEFAULT_NODE_HEIGHT) / 2 + offsetY,
  });

  // Edge'ler.
  context.lineWidth = 1.5;
  context.font = "12px system-ui, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";

  for (const edge of edges) {
    const source = nodeById.get(edge.sourceNodeId);
    const target = nodeById.get(edge.targetNodeId);

    if (!source || !target) {
      continue;
    }

    const sourceCenter = centerOf(source);
    const targetCenter = centerOf(target);

    const sourceWidth = source.width > 0 ? source.width : DEFAULT_NODE_WIDTH;

    const startX = sourceCenter.x + sourceWidth / 2;
    const startY = sourceCenter.y;
    const endX = targetCenter.x - (target.width > 0 ? target.width : DEFAULT_NODE_WIDTH) / 2;
    const endY = targetCenter.y;

    // Geriye dönük (rework) edge'ler düz çizilir.
    context.strokeStyle = "#475569";
    context.beginPath();
    context.moveTo(startX, startY);
    context.lineTo(endX, endY);
    context.stroke();

    // Ok ucu.
    const angle = Math.atan2(endY - startY, endX - startX);
    const arrowSize = 8;

    context.fillStyle = "#475569";
    context.beginPath();
    context.moveTo(endX, endY);
    context.lineTo(
      endX - arrowSize * Math.cos(angle - Math.PI / 6),
      endY - arrowSize * Math.sin(angle - Math.PI / 6),
    );
    context.lineTo(
      endX - arrowSize * Math.cos(angle + Math.PI / 6),
      endY - arrowSize * Math.sin(angle + Math.PI / 6),
    );
    context.closePath();
    context.fill();

    if (edge.label) {
      const labelX = (startX + endX) / 2;
      const labelY = (startY + endY) / 2;

      const textWidth = context.measureText(edge.label).width;

      context.fillStyle = background;
      context.fillRect(labelX - textWidth / 2 - 3, labelY - 9, textWidth + 6, 18);

      context.fillStyle = "#334155";
      context.fillText(edge.label, labelX, labelY);
    }
  }

  // Node'lar.
  for (const node of nodes) {
    const width = node.width > 0 ? node.width : DEFAULT_NODE_WIDTH;
    const height = node.height > 0 ? node.height : DEFAULT_NODE_HEIGHT;
    const x = node.positionX + offsetX;
    const y = node.positionY + offsetY;
    const colors = nodeColors(node.nodeType);
    const radius = 8;

    context.fillStyle = colors.fill;
    context.strokeStyle = colors.stroke;
    context.lineWidth = 1.5;

    context.beginPath();
    context.roundRect(x, y, width, height, radius);
    context.fill();
    context.stroke();

    context.textAlign = "left";
    context.textBaseline = "top";
    context.fillStyle = colors.text;

    const paddingX = 10;
    const titleWidth = width - paddingX * 2;

    context.font = "600 13px system-ui, sans-serif";

    const lines = wrapText((text) => context.measureText(text).width, node.title, titleWidth, 2);

    lines.forEach((line, index) => {
      context.fillText(line, x + paddingX, y + 8 + index * 16);
    });

    if (showNodeType) {
      context.font = "11px system-ui, sans-serif";
      context.fillStyle = colors.stroke;
      context.fillText(node.nodeType, x + paddingX, y + height - 20);
    }
  }
}
