import { z } from "zod";

/**
 * Flow editörü veri şeması.
 *
 * Editör grafiği istemciden gelir; kaydedilmeden önce burada doğrulanır.
 * Node ve edge sayıları sınırlıdır: tek transaction'da yazılabilen boyut.
 */

/** Node tipleri. */
export const flowNodeTypeSchema = z.enum([
  "START",
  "END",
  "ACTIVITY",
  "INSPECTION",
  "DECISION",
  "STORAGE",
  "TRANSPORT",
  "DOCUMENT",
  "SUBPROCESS",
  "PROCESS_STEP_REFERENCE",
  "PROCESS_FLOW_REFERENCE",
]);

export type FlowNodeType = z.infer<typeof flowNodeTypeSchema>;

/** Edge tipleri. */
export const flowEdgeTypeSchema = z.enum([
  "DEFAULT",
  "YES",
  "NO",
  "OK",
  "NOK",
  "CONDITIONAL",
  "REWORK",
  "MATERIAL_FLOW",
]);

export type FlowEdgeType = z.infer<typeof flowEdgeTypeSchema>;

/** Node girişi. */
export const flowNodeInputSchema = z.object({
  /**
   * Node id'si.
   *
   * Yeni node'lar için istemci uuid üretir; sunucu aynı id ile kaydeder.
   * Başka bir akışa ait id gönderilirse kayıt reddedilir.
   */
  id: z.string().uuid("Geçersiz node kimliği."),

  /** Revision'lar boyunca stabil teknik kimlik. */
  logicalId: z.string().min(1).max(64),

  nodeType: flowNodeTypeSchema,

  title: z.string().trim().min(1, "Node başlığı zorunludur.").max(200),

  description: z.string().trim().max(2000),

  positionX: z.number().finite(),
  positionY: z.number().finite(),

  width: z.number().positive().max(2000).optional(),
  height: z.number().positive().max(2000).optional(),

  config: z.record(z.string(), z.unknown()).optional(),

  sortOrder: z.number().int().optional(),
});

export type FlowNodeInput = z.infer<typeof flowNodeInputSchema>;

/** Edge girişi. */
export const flowEdgeInputSchema = z.object({
  id: z.string().uuid("Geçersiz bağlantı kimliği."),

  /** Revision'lar boyunca stabil teknik kimlik. */
  logicalId: z.string().min(1).max(64),

  sourceNodeId: z.string().uuid("Geçersiz node kimliği."),
  targetNodeId: z.string().uuid("Geçersiz node kimliği."),

  sourceHandle: z.string().max(64).nullable().optional(),
  targetHandle: z.string().max(64).nullable().optional(),

  label: z.string().trim().max(200).nullable().optional(),

  /** Yalnızca dokümantasyon amaçlı koşul metni. */
  condition: z.string().trim().max(2000).nullable().optional(),

  edgeType: flowEdgeTypeSchema,

  sortOrder: z.number().int().optional(),
});

export type FlowEdgeInput = z.infer<typeof flowEdgeInputSchema>;

/** Kaydedilecek grafik. */
export const flowGraphSchema = z.object({
  name: z.string().trim().min(1, "Akış adı zorunludur.").max(200),

  description: z.string().trim().max(2000),

  nodes: z.array(flowNodeInputSchema).max(500, "Akış en fazla 500 node içerebilir."),

  edges: z.array(flowEdgeInputSchema).max(1000, "Akış en fazla 1000 bağlantı içerebilir."),
});

export type FlowGraphInput = z.infer<typeof flowGraphSchema>;

/** Kaydetme isteği. */
export const flowSaveSchema = z.object({
  revisionId: z.string().uuid("Geçersiz revision."),

  /**
   * Beklenen revision sürümü.
   *
   * Optimistic concurrency: başka bir kullanıcı revision'ı değiştirdiyse
   * eski edit ekranından gelen kayıt reddedilir.
   */
  expectedVersion: z.number().int().positive(),

  graph: flowGraphSchema,
});

export type FlowSaveInput = z.infer<typeof flowSaveSchema>;
