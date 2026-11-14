/**
 * Revision karşılaştırması.
 *
 * İki revision'ın teknik içeriği karşılaştırılır. Değişiklikler
 * **mantıksal kimliğe** (`logicalId`) göre eşleştirilir: aynı teknik kayıt
 * revision'lar boyunca aynı `logicalId` taşır, isim veya konum değişmiş
 * olsa bile eşleşir.
 *
 * Bu modül saf fonksiyonlardan oluşur: karşılaştırma kuralları veritabanından
 * bağımsız test edilir.
 */

/** Karşılaştırılan içerik kategorisi. */
export type RevisionContentCategory =
  | "FLOW"
  | "WORK_ELEMENT"
  | "FUNCTION"
  | "REQUIREMENT"
  | "IO"
  | "APPLICABILITY";

/** Değişiklik tipi. */
export type RevisionChangeType = "ADDED" | "REMOVED" | "UPDATED";

/** Tek bir değişiklik. */
export type RevisionChange = {
  category: RevisionContentCategory;
  type: RevisionChangeType;

  /** Değişen kaydın mantıksal kimliği. */
  logicalId: string;

  /** Kullanıcıya gösterilen etiket. */
  label: string;

  /** Değişen alanlar; `UPDATED` için doludur. */
  fields: string[];

  /** Yalnızca görsel düzen (konum) değişti mi? */
  layoutOnly: boolean;
};

/** Karşılaştırma için node özeti. */
export type SnapshotNode = {
  logicalId: string;
  nodeType: string;
  title: string;
  description: string | null;
  positionX: number;
  positionY: number;
};

/** Karşılaştırma için edge özeti. */
export type SnapshotEdge = {
  logicalId: string;
  sourceLogicalId: string;
  targetLogicalId: string;
  label: string | null;
  condition: string | null;
  edgeType: string;
};

/** Karşılaştırma için work element özeti. */
export type SnapshotWorkElement = {
  logicalId: string;
  code: string;
  name: string;
  description: string | null;
  category: string;
};

/** Karşılaştırma için fonksiyon özeti. */
export type SnapshotFunction = {
  logicalId: string;
  name: string;
  description: string | null;
  functionScope: string;
};

/** Karşılaştırma için gereklilik özeti. */
export type SnapshotRequirement = {
  logicalId: string;
  code: string;
  name: string;
  description: string | null;
  requirementType: string;
  sourceReference: string | null;
  isMandatory: boolean;
};

/** Karşılaştırma için girdi/çıktı özeti. */
export type SnapshotIo = {
  logicalId: string;
  direction: string;
  resourceType: string;
  name: string;
  description: string | null;
};

/** Karşılaştırma için applicability özeti. */
export type SnapshotApplicability = {
  logicalId: string;
  name: string;
  description: string | null;
  supplyType: string | null;
  joiningMethod: string | null;
  itemGroupCodes: string[];
};

/** Bir revision'ın karşılaştırılabilir içeriği. */
export type RevisionSnapshot = {
  nodes: SnapshotNode[];
  edges: SnapshotEdge[];
  workElements: SnapshotWorkElement[];
  functions: SnapshotFunction[];
  requirements: SnapshotRequirement[];
  io: SnapshotIo[];
  applicabilities: SnapshotApplicability[];
};

/**
 * İki listeyi mantıksal kimliğe göre karşılaştırır.
 *
 * Teknik alanlar ve konum (layout) alanları ayrı değerlendirilir: yalnızca
 * node konumu değişmişse değişiklik "layout" olarak işaretlenir.
 */
function compareRecords<T extends { logicalId: string }>(
  category: RevisionContentCategory,
  before: T[],
  after: T[],
  options: {
    /** Teknik alanlar; karşılaştırılır. */
    fields: (keyof T)[];
    /** Konum alanları; ayrı değerlendirilir. */
    layoutFields?: (keyof T)[];
    /** Görünen etiket. */
    label: (record: T) => string;
  },
): RevisionChange[] {
  const changes: RevisionChange[] = [];

  const beforeMap = new Map(before.map((record) => [record.logicalId, record]));
  const afterMap = new Map(after.map((record) => [record.logicalId, record]));

  for (const [logicalId, record] of afterMap) {
    const previous = beforeMap.get(logicalId);

    if (!previous) {
      changes.push({
        category,
        type: "ADDED",
        logicalId,
        label: options.label(record),
        fields: [],
        layoutOnly: false,
      });

      continue;
    }

    const changedFields = options.fields.filter(
      (field) => JSON.stringify(previous[field]) !== JSON.stringify(record[field]),
    );

    if (changedFields.length > 0) {
      changes.push({
        category,
        type: "UPDATED",
        logicalId,
        label: options.label(record),
        fields: changedFields.map((field) => String(field)),
        layoutOnly: false,
      });

      continue;
    }

    const changedLayout = (options.layoutFields ?? []).filter(
      (field) => JSON.stringify(previous[field]) !== JSON.stringify(record[field]),
    );

    if (changedLayout.length > 0) {
      changes.push({
        category,
        type: "UPDATED",
        logicalId,
        label: options.label(record),
        fields: changedLayout.map((field) => String(field)),
        layoutOnly: true,
      });
    }
  }

  for (const [logicalId, record] of beforeMap) {
    if (!afterMap.has(logicalId)) {
      changes.push({
        category,
        type: "REMOVED",
        logicalId,
        label: options.label(record),
        fields: [],
        layoutOnly: false,
      });
    }
  }

  return changes;
}

/**
 * İki revision'ın teknik içeriğini karşılaştırır.
 *
 * @param before eski revision'ın içeriği.
 * @param after yeni revision'ın içeriği.
 */
export function compareRevisions(
  before: RevisionSnapshot,
  after: RevisionSnapshot,
): RevisionChange[] {
  const changes: RevisionChange[] = [];

  changes.push(
    ...compareRecords("FLOW", before.nodes, after.nodes, {
      fields: ["nodeType", "title", "description"],
      layoutFields: ["positionX", "positionY"],
      label: (node) => node.title,
    }),
  );

  changes.push(
    ...compareRecords("FLOW", before.edges, after.edges, {
      fields: ["sourceLogicalId", "targetLogicalId", "label", "condition", "edgeType"],
      label: (edge) => edge.label ?? edge.logicalId,
    }),
  );

  changes.push(
    ...compareRecords("WORK_ELEMENT", before.workElements, after.workElements, {
      fields: ["code", "name", "description", "category"],
      label: (entry) => `${entry.code} · ${entry.name}`,
    }),
  );

  changes.push(
    ...compareRecords("FUNCTION", before.functions, after.functions, {
      fields: ["name", "description", "functionScope"],
      label: (entry) => entry.name,
    }),
  );

  changes.push(
    ...compareRecords("REQUIREMENT", before.requirements, after.requirements, {
      fields: ["code", "name", "description", "requirementType", "sourceReference", "isMandatory"],
      label: (entry) => `${entry.code} · ${entry.name}`,
    }),
  );

  changes.push(
    ...compareRecords("IO", before.io, after.io, {
      fields: ["direction", "resourceType", "name", "description"],
      label: (entry) => entry.name,
    }),
  );

  changes.push(
    ...compareRecords("APPLICABILITY", before.applicabilities, after.applicabilities, {
      fields: ["name", "description", "supplyType", "joiningMethod", "itemGroupCodes"],
      label: (entry) => entry.name,
    }),
  );

  return changes;
}

/**
 * Yalnızca teknik değişiklikleri döndürür.
 *
 * Görsel düzen (konum) değişiklikleri ayrı tutulur: bir node'un taşınması
 * teknik proses değişikliği sayılmaz.
 */
export function technicalChanges(changes: RevisionChange[]): RevisionChange[] {
  return changes.filter((change) => !change.layoutOnly);
}

/** Yalnızca görsel düzen değişikliklerini döndürür. */
export function layoutChanges(changes: RevisionChange[]): RevisionChange[] {
  return changes.filter((change) => change.layoutOnly);
}
