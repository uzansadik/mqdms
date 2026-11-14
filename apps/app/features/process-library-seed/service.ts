import { type AuthContext, hasPermission } from "@mqdms/auth/permissions/server";

import { findProcessByCode } from "@/features/master-processes/repository";
import { createProcess } from "@/features/master-processes/service";
import {
  listProcessApplicabilities,
  listProcessIoDefinitions,
} from "@/features/process-io/repository";
import {
  createProcessApplicability,
  createProcessIoDefinition,
} from "@/features/process-io/service";
import {
  listProcessFunctions,
  listProcessRequirements,
} from "@/features/process-requirements/repository";
import {
  createProcessFunction,
  createProcessRequirement,
  linkFunctionRequirement,
} from "@/features/process-requirements/service";
import { deriveProcessVariant } from "@/features/process-variants/derivation";
import {
  findProcessVariantByCode,
  findProcessVariantRevisionByValue,
  listProcessVariantRevisions,
} from "@/features/process-variants/repository";
import {
  approveProcessVariantRevision,
  createProcessVariant,
  createProcessVariantRevision,
  releaseProcessVariantRevision,
  submitProcessVariantRevision,
} from "@/features/process-variants/service";
import {
  attachWorkElementToNode,
  createWorkElement,
} from "@/features/process-work-elements/service";
import { listWorkElements } from "@/features/process-work-elements/repository";

import { getFlowEditorData, saveFlowGraph } from "../flow-editor/service";
import type { FlowGraphInput } from "../flow-editor/schema";

/**
 * Proses kütüphanesi başlangıç şablonu.
 *
 * Şablon, dokümandaki örnek kütüphaneyi kurar: GKK ana prosesi, onun jenerik
 * varyantı ve jenerik varyantan türetilen metal ve kimyasal varyantlar.
 *
 * Şablon **opsiyoneldir**: hiçbir organizasyona otomatik yüklenmez, yalnızca
 * kullanıcı açıkça istediğinde kurulur. Kurulum **idempotenttir**: var olan
 * kodlar atlanır, ikinci çalıştırma kütüphaneyi bozmaz.
 *
 * Örnek gereklilikler gerçek müşteri tarafından onaylanmış gereklilikler
 * değildir; kayıtların açıklamasında bu belirtilir.
 */

/** Seed hatası. */
export class ProcessLibrarySeedError extends Error {
  constructor(
    message: string,
    readonly code: "FORBIDDEN" | "FAILED" = "FAILED",
  ) {
    super(message);
    this.name = "ProcessLibrarySeedError";
  }
}

/** Seed sonucu. */
export type ProcessLibrarySeedResult = {
  /** Oluşturulan ana proses sayısı. */
  processes: number;

  /** Oluşturulan varyant sayısı. */
  variants: number;

  /** Oluşturulan revision sayısı. */
  revisions: number;

  /** Atlanan kayıtların kodları. */
  skipped: string[];
};

/** Şablonun tanımladığı ana prosesler. */
const DEMO_PROCESSES: {
  code: string;
  name: string;
  category: "MANUFACTURING" | "INSPECTION" | "ASSEMBLY";
  description: string;
}[] = [
  {
    code: "GKK",
    name: "Girdi Kalite Kontrol",
    category: "INSPECTION",
    description: "Üretime girecek malzemenin şartlara uygunluğunun kontrol edildiği proses.",
  },
  {
    code: "GELCOAT",
    name: "Gelcoat",
    category: "MANUFACTURING",
    description: "Kalıp yüzeyine jelcoat uygulama prosesi.",
  },
  {
    code: "VACUUM-INFUSION",
    name: "Vakum İnfüzyon",
    category: "MANUFACTURING",
    description: "Reçine ve cam elyafın vakum altında infüzyon edilmesi.",
  },
  {
    code: "CURE",
    name: "Kürleme",
    category: "MANUFACTURING",
    description: "Reçine ve matrisin tam hâle gelmesi için bekletilmesi.",
  },
  {
    code: "TRIM",
    name: "Trim",
    category: "MANUFACTURING",
    description: "Fazla malzemenin kesilerek profilin oluşturulması.",
  },
  {
    code: "BONDING",
    name: "Bonding",
    category: "ASSEMBLY",
    description: "Parçaların yapıştırıcı ile birleştirilmesi.",
  },
  {
    code: "PAINT",
    name: "Boya",
    category: "MANUFACTURING",
    description: "Yüzey koruma ve görsel amaçlı boyama.",
  },
  {
    code: "FINAL-QC",
    name: "Final Kalite Kontrol",
    category: "INSPECTION",
    description: "Ürünün sevkiyat öncesi son kontrolü.",
  },
];

/** Demo içeriğin örnek olduğuna dair uyarı. */
const DEMO_NOTE =
  "Bu kayıt başlangıç şablonuna aittir; müşteri tarafından onaylanmış gerçek bir gereklilik değildir.";

/** Yeni uuid üretir. */
function newId(): string {
  return crypto.randomUUID();
}

/**
 * Şablonu kurar.
 *
 * Kurulum sırası önemlidir: türetme kaynağın **yayınlanmış** olmasını
 * gerektirir, bu yüzden jenerik varyant önce yayınlanır.
 */
export async function seedProcessLibraryTemplate(
  context: AuthContext,
): Promise<ProcessLibrarySeedResult> {
  if (!(await hasPermission(context, "masterProcesses", "create"))) {
    throw new ProcessLibrarySeedError("Bu işlem için yetkiniz yok.", "FORBIDDEN");
  }

  const result: ProcessLibrarySeedResult = {
    processes: 0,
    variants: 0,
    revisions: 0,
    skipped: [],
  };

  // 1. Ana prosesler.
  const processIds = new Map<string, string>();

  for (const demo of DEMO_PROCESSES) {
    const existing = await findProcessByCode(context.organizationId, demo.code);

    if (existing) {
      result.skipped.push(demo.code);
      processIds.set(demo.code, existing.id);

      continue;
    }

    const processId = await createProcess(context, {
      code: demo.code,
      name: demo.name,
      description: demo.description,
      category: demo.category,
      status: "ACTIVE",
    });

    processIds.set(demo.code, processId);
    result.processes += 1;
  }

  const gkkProcessId = processIds.get("GKK");

  if (!gkkProcessId) {
    throw new ProcessLibrarySeedError("GKK ana prosesi oluşturulamadı.", "FAILED");
  }

  // 2. Jenerik varyant ve revision'ı.
  const genericVariantId = await findOrCreateVariant(context, result, {
    processId: gkkProcessId,
    code: "GKK-GENERIC",
    name: "GKK Jenerik",
    description: "Malzeme türünden bağımsız girdi kalite kontrol akışı.",
    variantType: "GENERIC",
  });

  const genericRevisionId = await findOrCreateRevision(context, result, genericVariantId, "REV.01");

  await seedGenericContent(context, genericRevisionId);

  // 3. Jenerik revision yayınlanır: türetme kaynağı yayınlanmış olmalıdır.
  const genericRevision = await findProcessVariantRevisionByValue(
    context.organizationId,
    genericVariantId,
    "REV.01",
  );

  if (!genericRevision) {
    throw new ProcessLibrarySeedError("Jenerik revision oluşturulamadı.", "FAILED");
  }

  if (genericRevision.status === "DRAFT") {
    await submitProcessVariantRevision(context, genericRevision.id);
    await approveProcessVariantRevision(context, genericRevision.id);
    await releaseProcessVariantRevision(context, genericRevision.id);
  }

  // 4. Metal varyantı.
  await seedSpecializedVariant(context, result, {
    processId: gkkProcessId,
    sourceRevisionId: genericRevision.id,
    code: "GKK-METAL",
    name: "GKK Metal",
    description: "GKK Jenerik'ten türetilmiş metal malzeme uygulaması.",
    kind: "METAL",
  });

  // 5. Kimyasal varyantı.
  await seedSpecializedVariant(context, result, {
    processId: gkkProcessId,
    sourceRevisionId: genericRevision.id,
    code: "GKK-CHEMICAL",
    name: "GKK Kimyasal",
    description: "GKK Jenerik'ten türetilmiş kimyasal malzeme uygulaması.",
    kind: "CHEMICAL",
  });

  return result;
}

/** Varyant yoksa oluşturur. */
async function findOrCreateVariant(
  context: AuthContext,
  result: ProcessLibrarySeedResult,
  input: {
    processId: string;
    code: string;
    name: string;
    description: string;
    variantType: "GENERIC" | "SPECIALIZED";
  },
): Promise<string> {
  const existing = await findProcessVariantByCode(context.organizationId, input.code);

  if (existing) {
    result.skipped.push(input.code);

    return existing.id;
  }

  const variantId = await createProcessVariant(context, {
    processId: input.processId,
    code: input.code,
    name: input.name,
    description: input.description,
    variantType: input.variantType,
    status: "ACTIVE",
  });

  result.variants += 1;

  return variantId;
}

/** Revision yoksa oluşturur. */
async function findOrCreateRevision(
  context: AuthContext,
  result: ProcessLibrarySeedResult,
  variantId: string,
  revision: string,
): Promise<string> {
  const existing = await findProcessVariantRevisionByValue(
    context.organizationId,
    variantId,
    revision,
  );

  if (existing) {
    return existing.id;
  }

  const revisionId = await createProcessVariantRevision(context, variantId, {
    revision,
    description: "Başlangıç şablonu ile oluşturuldu.",
    changeReason: "Başlangıç şablonu.",
  });

  result.revisions += 1;

  return revisionId;
}

/** Uzmanlaşmış varyantı türetir ve zenginleştirir. */
async function seedSpecializedVariant(
  context: AuthContext,
  result: ProcessLibrarySeedResult,
  input: {
    processId: string;
    sourceRevisionId: string;
    code: string;
    name: string;
    description: string;
    kind: "METAL" | "CHEMICAL";
  },
): Promise<void> {
  const existing = await findProcessVariantByCode(context.organizationId, input.code);

  if (existing) {
    result.skipped.push(input.code);

    const revisions = await listProcessVariantRevisions(context.organizationId, existing.id);
    const draft = revisions.find((revision) => revision.status === "DRAFT") ?? revisions[0];

    if (draft) {
      await seedSpecializedContent(context, draft.id, input.kind);
    }

    return;
  }

  /*
   * Varyant türetme sırasında oluşturulur: `deriveProcessVariant` hem
   * varyantı hem de ilk `DRAFT` revision'ını kendisi oluşturur. Önce ayrıca
   * `createProcessVariant` çağırmak aynı kodun ikinci kez kullanılmasına ve
   * türetmenin reddedilmesine yol açardı.
   */
  const derivation = await deriveProcessVariant(context, {
    sourceVariantRevisionId: input.sourceRevisionId,
    code: input.code,
    name: input.name,
    description: input.description,
    selections: {
      flow: true,
      workElements: true,
      functions: true,
      requirements: true,
      io: true,
      applicability: true,
    },
  });

  result.revisions += 1;
  result.variants += 1;

  await seedSpecializedContent(context, derivation.revisionId, input.kind);
}

/**
 * Jenerik varyantın teknik içeriğini kurar.
 *
 * Akış, work element, fonksiyon, gereklilik, girdi/çıktı ve applicability
 * kayıtları oluşturulur. Kayıtlar zaten varsa atlanır.
 */
async function seedGenericContent(context: AuthContext, revisionId: string): Promise<void> {
  const data = await getFlowEditorData(context.organizationId, revisionId);

  if (!data) {
    throw new ProcessLibrarySeedError("Jenerik revision okunamadı.", "FAILED");
  }

  /*
   * Yayınlanmış revision değiştirilemez. İçerik ilk kurulumda yazıldığı için
   * yeniden denemede atlanır; aksi halde kurulum ikinci çalıştırmada
   * değiştirilemeyen bir revision'a yazmaya çalışıp başarısız olurdu.
   */
  if (data.revision.status !== "DRAFT") {
    return;
  }

  // Akış.
  if (data.nodes.length === 0) {
    await saveFlowGraph(context, {
      revisionId,
      expectedVersion: data.revision.version,
      graph: genericFlowGraph(),
    });
  }

  // Work element'ler.
  const workElements = await listWorkElements(context.organizationId, revisionId);
  const workElementCodes = new Set(workElements.map((entry) => entry.code));

  const demoWorkElements: {
    code: string;
    name: string;
    description: string;
    category: "MAN" | "MACHINE" | "MATERIAL" | "ENVIRONMENT";
  }[] = [
    {
      code: "WE-OPERATOR",
      name: "GKK operatörü",
      description: "Kontrolü yapan operatör.",
      category: "MAN",
    },
    {
      code: "WE-EQUIPMENT",
      name: "Kontrol ekipmanı",
      description: "Ölçüm ve görsel kontrol için kullanılan ekipman.",
      category: "MACHINE",
    },
    {
      code: "WE-MATERIAL",
      name: "Gelen malzeme",
      description: "Kontrol edilecek gelen malzeme.",
      category: "MATERIAL",
    },
    {
      code: "WE-ENVIRONMENT",
      name: "Kontrol ortamı",
      description: "Görsel kontrol için yeterli aydınlatma sağlayan ortam.",
      category: "ENVIRONMENT",
    },
  ];

  for (const demo of demoWorkElements) {
    if (workElementCodes.has(demo.code)) {
      continue;
    }

    await createWorkElement(context, {
      processVariantRevisionId: revisionId,
      code: demo.code,
      name: demo.name,
      description: demo.description,
      category: demo.category,
      itemId: null,
      itemGroupId: null,
    });
  }

  // Node ↔ work element bağlantıları.
  const graph = await getFlowEditorData(context.organizationId, revisionId);
  const inspectNode = graph?.nodes.find((node) => node.title === "Kontrol yap");
  const receiveNode = graph?.nodes.find((node) => node.title === "Malzeme teslim al");

  if (inspectNode) {
    await attachWorkElement(
      context,
      inspectNode.id,
      await findWorkElementId(context, revisionId, "WE-OPERATOR"),
    );
    await attachWorkElement(
      context,
      inspectNode.id,
      await findWorkElementId(context, revisionId, "WE-EQUIPMENT"),
    );
    await attachWorkElement(
      context,
      inspectNode.id,
      await findWorkElementId(context, revisionId, "WE-MATERIAL"),
    );
  }

  if (receiveNode) {
    await attachWorkElement(
      context,
      receiveNode.id,
      await findWorkElementId(context, revisionId, "WE-MATERIAL"),
    );
  }

  // Gereklilikler.
  const requirements = await listProcessRequirements(context.organizationId, revisionId);
  const requirementCodes = new Set(requirements.map((entry) => entry.code));

  let certification = requirements.find((entry) => entry.code === "REQ-CERT")?.id ?? null;

  if (!certification && !requirementCodes.has("REQ-CERT")) {
    certification = await createProcessRequirement(context, {
      processVariantRevisionId: revisionId,
      code: "REQ-CERT",
      name: "Gerekli durumlarda malzeme sertifikası bulunması",
      description: DEMO_NOTE,
      requirementType: "CUSTOMER",
      sourceReference: "",
      isMandatory: true,
    });
  }

  let calibration = requirements.find((entry) => entry.code === "REQ-CAL")?.id ?? null;

  if (!calibration && !requirementCodes.has("REQ-CAL")) {
    calibration = await createProcessRequirement(context, {
      processVariantRevisionId: revisionId,
      code: "REQ-CAL",
      name: "Ölçüm ekipmanının geçerli kalibrasyona sahip olması",
      description: DEMO_NOTE,
      requirementType: "REGULATORY",
      sourceReference: "",
      isMandatory: true,
    });
  }

  // Fonksiyonlar.
  const functions = await listProcessFunctions(context.organizationId, revisionId);
  const functionNames = new Set(functions.map((entry) => entry.name));

  let processFunction = functions.find(
    (entry) => entry.name === "Uygunsuz malzemenin üretime girişini önlemek",
  )?.id;

  if (!processFunction && !functionNames.has("Uygunsuz malzemenin üretime girişini önlemek")) {
    processFunction = await createProcessFunction(context, {
      processVariantRevisionId: revisionId,
      name: "Uygunsuz malzemenin üretime girişini önlemek",
      description: DEMO_NOTE,
      functionScope: "PROCESS",
      processWorkElementId: null,
    });
  }

  let operatorFunction = functions.find(
    (entry) => entry.name === "Teknik resimdeki ölçü gerekliliklerini doğru yorumlamak",
  )?.id;

  if (
    !operatorFunction &&
    !functionNames.has("Teknik resimdeki ölçü gerekliliklerini doğru yorumlamak")
  ) {
    operatorFunction = await createProcessFunction(context, {
      processVariantRevisionId: revisionId,
      name: "Teknik resimdeki ölçü gerekliliklerini doğru yorumlamak",
      description: DEMO_NOTE,
      functionScope: "WORK_ELEMENT",
      processWorkElementId: await findWorkElementId(context, revisionId, "WE-OPERATOR"),
    });
  }

  if (processFunction && certification) {
    await linkFunctionRequirement(context, processFunction, certification);
  }

  if (operatorFunction && calibration) {
    await linkFunctionRequirement(context, operatorFunction, calibration);
  }

  // Girdi / çıktı.
  const ioDefinitions = await listProcessIoDefinitions(context.organizationId, revisionId);
  const ioNames = new Set(ioDefinitions.map((entry) => `${entry.direction}:${entry.name}`));

  if (!ioNames.has("INPUT:Satın alınan malzeme")) {
    await createProcessIoDefinition(context, {
      processVariantRevisionId: revisionId,
      direction: "INPUT",
      resourceType: "MATERIAL",
      name: "Satın alınan malzeme",
      description: "Kontrol edilecek gelen malzeme.",
      itemGroupId: null,
      itemId: null,
      processState: "",
      isRequired: true,
    });
  }

  if (!ioNames.has("OUTPUT:Girdi kalite kontrol kaydı")) {
    await createProcessIoDefinition(context, {
      processVariantRevisionId: revisionId,
      direction: "OUTPUT",
      resourceType: "INFORMATION",
      name: "Girdi kalite kontrol kaydı",
      description: "Kontrol sonucunun kaydı.",
      itemGroupId: null,
      itemId: null,
      processState: "",
      isRequired: false,
    });
  }

  // Applicability.
  const applicabilities = await listProcessApplicabilities(context.organizationId, revisionId);

  if (!applicabilities.some((entry) => entry.name === "GKK uygulanabilirliği")) {
    await createProcessApplicability(context, {
      processVariantRevisionId: revisionId,
      name: "GKK uygulanabilirliği",
      description: DEMO_NOTE,
      supplyType: "PURCHASED",
      joiningMethod: null,
      isActive: true,
      itemGroupIds: [],
    });
  }
}

/** Uzmanlaşmış varyantın içeriğini zenginleştirir. */
async function seedSpecializedContent(
  context: AuthContext,
  revisionId: string,
  kind: "METAL" | "CHEMICAL",
): Promise<void> {
  const data = await getFlowEditorData(context.organizationId, revisionId);

  if (!data) {
    return;
  }

  // Yayınlanmış revision değiştirilemez; yeniden denemede atlanır.
  if (data.revision.status !== "DRAFT") {
    return;
  }

  const extras =
    kind === "METAL"
      ? {
          nodes: [
            {
              title: "Sertifika kontrolü",
              nodeType: "INSPECTION" as const,
              description: "Malzeme sertifikasının varlığı ve içeriğinin doğrulanması.",
            },
            {
              title: "Boyutsal kontrol",
              nodeType: "INSPECTION" as const,
              description: "Kumpas ile boyutsal ölçüm yapılması.",
            },
          ],
          workElements: [
            {
              code: "WE-CALIPER",
              name: "Kumpas",
              description: "Boyutsal ölçüm için kumpas.",
              category: "MACHINE" as const,
            },
            {
              code: "WE-METAL",
              name: "Metal parça",
              description: "Kontrol edilen metal malzeme.",
              category: "MATERIAL" as const,
            },
          ],
        }
      : {
          nodes: [
            {
              title: "Parti ve raf ömrü kontrolü",
              nodeType: "INSPECTION" as const,
              description: "Parti numarasının ve raf ömrünün kontrolü.",
            },
            {
              title: "Analiz sertifikası değerlendirmesi",
              nodeType: "INSPECTION" as const,
              description: "Analiz sertifikasının değerlendirilmesi.",
            },
          ],
          workElements: [
            {
              code: "WE-CHEM",
              name: "Kimyasal malzeme",
              description: "Kontrol edilen kimyasal malzeme.",
              category: "MATERIAL" as const,
            },
            {
              code: "WE-READER",
              name: "Etiket okuyucu",
              description: "Parti ve raf ömrü bilgisinin okunması için cihaz.",
              category: "MACHINE" as const,
            },
          ],
        };

  // Akışa yeni node'lar eklenir.
  const alreadyExtended = data.nodes.some((node) =>
    extras.nodes.some((extra) => extra.title === node.title),
  );

  if (!alreadyExtended && data.nodes.length > 0) {
    const graph = await extendFlowGraph(data, extras.nodes);
    const refreshed = await getFlowEditorData(context.organizationId, revisionId);

    await saveFlowGraph(context, {
      revisionId,
      expectedVersion: refreshed?.revision.version ?? data.revision.version,
      graph,
    });
  }

  // Work element'ler.
  const workElements = await listWorkElements(context.organizationId, revisionId);
  const existingCodes = new Set(workElements.map((entry) => entry.code));

  for (const extra of extras.workElements) {
    if (existingCodes.has(extra.code)) {
      continue;
    }

    await createWorkElement(context, {
      processVariantRevisionId: revisionId,
      code: extra.code,
      name: extra.name,
      description: extra.description,
      category: extra.category,
      itemId: null,
      itemGroupId: null,
    });
  }
}

/** Node'a work element bağlar (yoksa atlanır). */
async function attachWorkElement(
  context: AuthContext,
  flowNodeId: string,
  processWorkElementId: string | null,
): Promise<void> {
  if (!processWorkElementId) {
    return;
  }

  await attachWorkElementToNode(context, flowNodeId, processWorkElementId);
}

/** Koduyla work element'in id'sini bulur. */
async function findWorkElementId(
  context: AuthContext,
  revisionId: string,
  code: string,
): Promise<string | null> {
  const workElements = await listWorkElements(context.organizationId, revisionId);

  return workElements.find((entry) => entry.code === code)?.id ?? null;
}

/**
 * Akışa, kontrollü kontrol adımı ile ek node'ları ekler.
 *
 * Yeni node'lar "Kontrol yap" ile "Uygun mu?" arasına yerleştirilir; karar
 * node'u ve sonraki node'lar kaydırılır.
 */
function extendFlowGraph(
  data: NonNullable<Awaited<ReturnType<typeof getFlowEditorData>>>,
  extraNodes: { title: string; nodeType: "INSPECTION"; description: string }[],
): FlowGraphInput {
  const nodes = data.nodes.map((node) => ({
    id: node.id,
    logicalId: node.logicalId,
    nodeType: node.nodeType,
    title: node.title,
    description: node.description ?? "",
    positionX: Number(node.positionX),
    positionY: Number(node.positionY),
    width: Number(node.width),
    height: Number(node.height),
    config: node.config,
  }));

  const edges = data.edges.map((edge) => ({
    id: edge.id,
    logicalId: edge.logicalId,
    sourceNodeId: edge.sourceNodeId,
    targetNodeId: edge.targetNodeId,
    sourceHandle: edge.sourceHandle,
    targetHandle: edge.targetHandle,
    label: edge.label,
    condition: edge.condition,
    edgeType: edge.edgeType,
  }));

  const inspect = nodes.find((node) => node.title === "Kontrol yap");
  const decision = nodes.find((node) => node.title === "Uygun mu?");

  if (!inspect || !decision) {
    return {
      name: data.flow?.name ?? "",
      description: data.flow?.description ?? "",
      nodes,
      edges,
    };
  }

  const shift = 240 * extraNodes.length;

  for (const node of nodes) {
    if (node.positionX >= decision.positionX) {
      node.positionX += shift;
    }
  }

  const inserted = extraNodes.map((extra, index) => ({
    id: newId(),
    logicalId: newId(),
    nodeType: extra.nodeType,
    title: extra.title,
    description: extra.description,
    positionX: inspect.positionX + 240 * (index + 1),
    positionY: inspect.positionY,
    width: 176,
    height: 56,
    config: {},
  }));

  // "Kontrol yap" → "Uygun mu?" bağlantısı yeni zincirle değiştirilir.
  const directEdge = edges.find(
    (edge) => edge.sourceNodeId === inspect.id && edge.targetNodeId === decision.id,
  );

  const chainEdges = inserted.map((node, index) => ({
    id: newId(),
    logicalId: newId(),
    sourceNodeId: index === 0 ? inspect.id : (inserted[index - 1]?.id ?? inspect.id),
    targetNodeId: node.id,
    sourceHandle: null,
    targetHandle: null,
    label: null,
    condition: null,
    edgeType: "DEFAULT" as const,
  }));

  const lastInserted = inserted[inserted.length - 1];

  if (lastInserted) {
    chainEdges.push({
      id: newId(),
      logicalId: newId(),
      sourceNodeId: lastInserted.id,
      targetNodeId: decision.id,
      sourceHandle: null,
      targetHandle: null,
      label: null,
      condition: null,
      edgeType: "DEFAULT",
    });
  }

  const remainingEdges = directEdge ? edges.filter((edge) => edge.id !== directEdge.id) : edges;

  return {
    name: data.flow?.name ?? "",
    description: data.flow?.description ?? "",
    nodes: [...nodes, ...inserted],
    edges: [...remainingEdges, ...chainEdges],
  };
}

/** Jenerik varyantın örnek akışı. */
function genericFlowGraph(): FlowGraphInput {
  const start = newId();
  const order = newId();
  const inspect = newId();
  const decision = newId();
  const accept = newId();
  const reject = newId();

  return {
    name: "GKK Jenerik akışı",
    description: "Malzeme teslim al → sipariş doğrula → kontrol → uygun mu? → kabul / ret.",
    nodes: [
      {
        id: start,
        logicalId: newId(),
        nodeType: "START",
        title: "Malzeme teslim al",
        description: "Gelen malzeme teslim alınır.",
        positionX: 0,
        positionY: 60,
        width: 176,
        height: 56,
        config: {},
      },
      {
        id: order,
        logicalId: newId(),
        nodeType: "ACTIVITY",
        title: "Siparişi doğrula",
        description: "Malzeme sipariş ve teknik resim ile karşılaştırılır.",
        positionX: 240,
        positionY: 60,
        width: 176,
        height: 56,
        config: {},
      },
      {
        id: inspect,
        logicalId: newId(),
        nodeType: "INSPECTION",
        title: "Kontrol yap",
        description: "Boyutsal ve görsel kontrol gerçekleştirilir.",
        positionX: 480,
        positionY: 60,
        width: 176,
        height: 56,
        config: {},
      },
      {
        id: decision,
        logicalId: newId(),
        nodeType: "DECISION",
        title: "Uygun mu?",
        description: "Kontrol sonucu değerlendirilir.",
        positionX: 720,
        positionY: 60,
        width: 176,
        height: 56,
        config: {},
      },
      {
        id: accept,
        logicalId: newId(),
        nodeType: "END",
        title: "Kabul",
        description: "Malzeme üretime kabul edilir.",
        positionX: 960,
        positionY: 0,
        width: 176,
        height: 56,
        config: {},
      },
      {
        id: reject,
        logicalId: newId(),
        nodeType: "END",
        title: "Ret",
        description: "Malzeme ret edilir.",
        positionX: 960,
        positionY: 120,
        width: 176,
        height: 56,
        config: {},
      },
    ],
    edges: [
      {
        id: newId(),
        logicalId: newId(),
        sourceNodeId: start,
        targetNodeId: order,
        sourceHandle: null,
        targetHandle: null,
        label: null,
        condition: null,
        edgeType: "DEFAULT",
      },
      {
        id: newId(),
        logicalId: newId(),
        sourceNodeId: order,
        targetNodeId: inspect,
        sourceHandle: null,
        targetHandle: null,
        label: null,
        condition: null,
        edgeType: "DEFAULT",
      },
      {
        id: newId(),
        logicalId: newId(),
        sourceNodeId: inspect,
        targetNodeId: decision,
        sourceHandle: null,
        targetHandle: null,
        label: null,
        condition: null,
        edgeType: "DEFAULT",
      },
      {
        id: newId(),
        logicalId: newId(),
        sourceNodeId: decision,
        targetNodeId: accept,
        sourceHandle: "yes",
        targetHandle: null,
        label: "OK",
        condition: null,
        edgeType: "YES",
      },
      {
        id: newId(),
        logicalId: newId(),
        sourceNodeId: decision,
        targetNodeId: reject,
        sourceHandle: "no",
        targetHandle: null,
        label: "NOK",
        condition: null,
        edgeType: "NO",
      },
    ],
  };
}
