import { relations } from "drizzle-orm";

import { flow, processVariantRevisionFlow } from "./flow";
import { flowEdge } from "./flow-edge";
import { flowNode } from "./flow-node";
import { process } from "./process";
import {
  processVariantApplicability,
  processVariantApplicabilityItemGroup,
} from "./process-applicability";
import { flowNodeFunction, processFunction, processFunctionRequirement } from "./process-function";
import { processIoDefinition } from "./process-io";
import { processRequirement } from "./process-requirement";
import { processVariant } from "./process-variant";
import { processVariantRevision } from "./process-variant-revision";
import { flowNodeWorkElement, processWorkElement } from "./process-work-element";

/**
 * Proses alanının ilişki tanımları.
 *
 * Tablolar dosyalara bölünmüştür; ilişkiler tek bir dosyada toplanır.
 * Böylece tablolar arasında döngüsel import oluşmaz: tablo dosyaları
 * ilişki dosyasını bilmez.
 */

export const processRelations = relations(process, ({ many }) => ({
  variants: many(processVariant),
}));

export const processVariantRelations = relations(processVariant, ({ one, many }) => ({
  process: one(process, {
    fields: [processVariant.processId],
    references: [process.id],
  }),

  revisions: many(processVariantRevision),
}));

export const processVariantRevisionRelations = relations(
  processVariantRevision,
  ({ one, many }) => ({
    processVariant: one(processVariant, {
      fields: [processVariantRevision.processVariantId],
      references: [processVariant.id],
    }),

    sourceVariantRevision: one(processVariantRevision, {
      fields: [processVariantRevision.sourceVariantRevisionId],
      references: [processVariantRevision.id],
      relationName: "processVariantRevisionSource",
    }),

    derivedRevisions: many(processVariantRevision, {
      relationName: "processVariantRevisionSource",
    }),

    flows: many(processVariantRevisionFlow),

    workElements: many(processWorkElement),

    functions: many(processFunction),

    requirements: many(processRequirement),

    ioDefinitions: many(processIoDefinition),

    applicabilities: many(processVariantApplicability),
  }),
);

export const flowRelations = relations(flow, ({ many }) => ({
  nodes: many(flowNode),
  edges: many(flowEdge),
}));

export const processVariantRevisionFlowRelations = relations(
  processVariantRevisionFlow,
  ({ one }) => ({
    processVariantRevision: one(processVariantRevision, {
      fields: [processVariantRevisionFlow.processVariantRevisionId],
      references: [processVariantRevision.id],
    }),

    flow: one(flow, {
      fields: [processVariantRevisionFlow.flowId],
      references: [flow.id],
    }),
  }),
);

export const flowNodeRelations = relations(flowNode, ({ one, many }) => ({
  flow: one(flow, {
    fields: [flowNode.flowId],
    references: [flow.id],
  }),

  workElements: many(flowNodeWorkElement),

  functions: many(flowNodeFunction),
}));

export const flowEdgeRelations = relations(flowEdge, ({ one }) => ({
  flow: one(flow, {
    fields: [flowEdge.flowId],
    references: [flow.id],
  }),

  sourceNode: one(flowNode, {
    fields: [flowEdge.sourceNodeId],
    references: [flowNode.id],
    relationName: "flowEdgeSource",
  }),

  targetNode: one(flowNode, {
    fields: [flowEdge.targetNodeId],
    references: [flowNode.id],
    relationName: "flowEdgeTarget",
  }),
}));

export const processWorkElementRelations = relations(processWorkElement, ({ one, many }) => ({
  processVariantRevision: one(processVariantRevision, {
    fields: [processWorkElement.processVariantRevisionId],
    references: [processVariantRevision.id],
  }),

  flowNodes: many(flowNodeWorkElement),

  functions: many(processFunction),
}));

export const flowNodeWorkElementRelations = relations(flowNodeWorkElement, ({ one }) => ({
  flowNode: one(flowNode, {
    fields: [flowNodeWorkElement.flowNodeId],
    references: [flowNode.id],
  }),

  processWorkElement: one(processWorkElement, {
    fields: [flowNodeWorkElement.processWorkElementId],
    references: [processWorkElement.id],
  }),
}));

export const processFunctionRelations = relations(processFunction, ({ one, many }) => ({
  processVariantRevision: one(processVariantRevision, {
    fields: [processFunction.processVariantRevisionId],
    references: [processVariantRevision.id],
  }),

  processWorkElement: one(processWorkElement, {
    fields: [processFunction.processWorkElementId],
    references: [processWorkElement.id],
  }),

  requirements: many(processFunctionRequirement),

  flowNodes: many(flowNodeFunction),
}));

export const processFunctionRequirementRelations = relations(
  processFunctionRequirement,
  ({ one }) => ({
    processFunction: one(processFunction, {
      fields: [processFunctionRequirement.processFunctionId],
      references: [processFunction.id],
    }),

    processRequirement: one(processRequirement, {
      fields: [processFunctionRequirement.processRequirementId],
      references: [processRequirement.id],
    }),
  }),
);

export const flowNodeFunctionRelations = relations(flowNodeFunction, ({ one }) => ({
  flowNode: one(flowNode, {
    fields: [flowNodeFunction.flowNodeId],
    references: [flowNode.id],
  }),

  processFunction: one(processFunction, {
    fields: [flowNodeFunction.processFunctionId],
    references: [processFunction.id],
  }),
}));

export const processRequirementRelations = relations(processRequirement, ({ one, many }) => ({
  processVariantRevision: one(processVariantRevision, {
    fields: [processRequirement.processVariantRevisionId],
    references: [processVariantRevision.id],
  }),

  functions: many(processFunctionRequirement),
}));

export const processIoDefinitionRelations = relations(processIoDefinition, ({ one }) => ({
  processVariantRevision: one(processVariantRevision, {
    fields: [processIoDefinition.processVariantRevisionId],
    references: [processVariantRevision.id],
  }),
}));

export const processVariantApplicabilityRelations = relations(
  processVariantApplicability,
  ({ one, many }) => ({
    processVariantRevision: one(processVariantRevision, {
      fields: [processVariantApplicability.processVariantRevisionId],
      references: [processVariantRevision.id],
    }),

    itemGroups: many(processVariantApplicabilityItemGroup),
  }),
);

export const processVariantApplicabilityItemGroupRelations = relations(
  processVariantApplicabilityItemGroup,
  ({ one }) => ({
    applicability: one(processVariantApplicability, {
      fields: [processVariantApplicabilityItemGroup.applicabilityId],
      references: [processVariantApplicability.id],
    }),
  }),
);
