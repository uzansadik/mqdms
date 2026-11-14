"use client";

import { useI18n } from "@mqdms/i18n";
import { Button } from "@mqdms/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@mqdms/ui/components/card";
import { Field, FieldLabel } from "@mqdms/ui/components/field";
import { Input } from "@mqdms/ui/components/input";
import { NativeSelect, NativeSelectOption } from "@mqdms/ui/components/native-select";
import { Textarea } from "@mqdms/ui/components/textarea";

import type { FlowEdgeType, FlowNodeType } from "../schema";

/** Seçili node'un düzenlenebilir alanları. */
export type SelectedNode = {
  id: string;
  nodeType: FlowNodeType;
  title: string;
  description: string;
};

/** Seçili edge'in düzenlenebilir alanları. */
export type SelectedEdge = {
  id: string;
  edgeType: FlowEdgeType;
  label: string;
  condition: string;
};

type FlowInspectorProps = {
  /** Seçili node. */
  node: SelectedNode | null;

  /** Seçili edge. */
  edge: SelectedEdge | null;

  /** Node alanı değişti. */
  onNodeChange: (id: string, patch: Partial<SelectedNode>) => void;

  /** Edge alanı değişti. */
  onEdgeChange: (id: string, patch: Partial<SelectedEdge>) => void;

  /** Seçili öğe silindi. */
  onDelete: (id: string, kind: "node" | "edge") => void;
};

const NODE_TYPES: FlowNodeType[] = [
  "START",
  "END",
  "ACTIVITY",
  "INSPECTION",
  "DECISION",
  "STORAGE",
  "TRANSPORT",
  "DOCUMENT",
  "SUBPROCESS",
];

const EDGE_TYPES: FlowEdgeType[] = [
  "DEFAULT",
  "YES",
  "NO",
  "OK",
  "NOK",
  "CONDITIONAL",
  "REWORK",
  "MATERIAL_FLOW",
];

/** Sağ panel: seçili node veya edge özellikleri. */
export function FlowInspector({
  node,
  edge,
  onNodeChange,
  onEdgeChange,
  onDelete,
}: FlowInspectorProps) {
  const { t } = useI18n();

  if (!node && !edge) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{t("flow.inspector.title")}</CardTitle>
        </CardHeader>

        <CardContent>
          <p className="text-sm text-muted-foreground">{t("flow.inspector.empty")}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">{t("flow.inspector.title")}</CardTitle>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {node && (
            <>
              <Field>
                <FieldLabel htmlFor="node-title">{t("flow.inspector.nodeTitle")}</FieldLabel>

                <Input
                  id="node-title"
                  onChange={(event) => onNodeChange(node.id, { title: event.target.value })}
                  value={node.title}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="node-type">{t("flow.inspector.nodeType")}</FieldLabel>

                <NativeSelect
                  id="node-type"
                  onChange={(event) =>
                    onNodeChange(node.id, { nodeType: event.target.value as FlowNodeType })
                  }
                  value={node.nodeType}
                >
                  {NODE_TYPES.map((type) => (
                    <NativeSelectOption key={type} value={type}>
                      {t(`flow.nodeTypes.${type}`)}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>

              <Field>
                <FieldLabel htmlFor="node-description">
                  {t("flow.inspector.nodeDescription")}
                </FieldLabel>

                <Textarea
                  id="node-description"
                  onChange={(event) => onNodeChange(node.id, { description: event.target.value })}
                  rows={3}
                  value={node.description}
                />
              </Field>
            </>
          )}

          {edge && (
            <>
              <Field>
                <FieldLabel htmlFor="edge-label">{t("flow.inspector.edgeLabel")}</FieldLabel>

                <Input
                  id="edge-label"
                  onChange={(event) => onEdgeChange(edge.id, { label: event.target.value })}
                  value={edge.label}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="edge-type">{t("flow.inspector.edgeType")}</FieldLabel>

                <NativeSelect
                  id="edge-type"
                  onChange={(event) =>
                    onEdgeChange(edge.id, { edgeType: event.target.value as FlowEdgeType })
                  }
                  value={edge.edgeType}
                >
                  {EDGE_TYPES.map((type) => (
                    <NativeSelectOption key={type} value={type}>
                      {t(`flow.edgeTypes.${type}`)}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>

              <Field>
                <FieldLabel htmlFor="edge-condition">
                  {t("flow.inspector.edgeCondition")}
                </FieldLabel>

                <Textarea
                  id="edge-condition"
                  onChange={(event) => onEdgeChange(edge.id, { condition: event.target.value })}
                  rows={3}
                  value={edge.condition}
                />
              </Field>
            </>
          )}

          {node && (
            <Button onClick={() => onDelete(node.id, "node")} type="button" variant="destructive">
              {t("flow.inspector.deleteNode")}
            </Button>
          )}

          {edge && (
            <Button onClick={() => onDelete(edge.id, "edge")} type="button" variant="destructive">
              {t("flow.inspector.deleteEdge")}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
