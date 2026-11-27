CREATE TYPE "public"."fmea_action_priority_method" AS ENUM('ACTION_PRIORITY');--> statement-breakpoint
CREATE TYPE "public"."fmea_action_status" AS ENUM('OPEN', 'IN_PROGRESS', 'DONE');--> statement-breakpoint
CREATE TYPE "public"."fmea_action_type" AS ENUM('PREVENT', 'DETECT', 'IMPROVE');--> statement-breakpoint
CREATE TYPE "public"."fmea_cause_category" AS ENUM('MAN', 'MACHINE', 'MATERIAL', 'ENVIRONMENT', 'METHOD', 'MEASUREMENT', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."fmea_characteristic_status" AS ENUM('OPEN', 'IDENTIFIED', 'IMPLEMENTED', 'VERIFIED');--> statement-breakpoint
CREATE TYPE "public"."fmea_characteristic_type" AS ENUM('PRODUCT', 'PROCESS');--> statement-breakpoint
CREATE TYPE "public"."fmea_control_effectiveness" AS ENUM('VERY_GOOD', 'GOOD', 'MODERATE', 'POOR', 'VERY_POOR');--> statement-breakpoint
CREATE TYPE "public"."fmea_control_type" AS ENUM('PREVENTION', 'DETECTION');--> statement-breakpoint
CREATE TYPE "public"."fmea_document_status" AS ENUM('DRAFT', 'IN_REVIEW', 'APPROVED', 'RELEASED');--> statement-breakpoint
CREATE TYPE "public"."fmea_evaluation_method" AS ENUM('ACTION_PRIORITY', 'RAG', 'BOTH');--> statement-breakpoint
CREATE TYPE "public"."fmea_function_aspect" AS ENUM('PURPOSE', 'INPUT', 'OUTPUT', 'CONTROL');--> statement-breakpoint
CREATE TYPE "public"."fmea_risk_method" AS ENUM('RISK_CLASS');--> statement-breakpoint
CREATE TYPE "public"."fmea_severity_classification" AS ENUM('NONE', 'SC1', 'SC2');--> statement-breakpoint
CREATE TYPE "public"."fmea_structure_level" AS ENUM('SYSTEM', 'SUBSYSTEM', 'COMPONENT');--> statement-breakpoint
CREATE TYPE "public"."fmea_type" AS ENUM('PFMEA', 'DFMEA', 'SFMEA');--> statement-breakpoint
CREATE TABLE "fmea_action" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"fmea_document_id" uuid NOT NULL,
	"failure_mode_id" uuid,
	"failure_cause_id" uuid,
	"action_type" "fmea_action_type" DEFAULT 'IMPROVE' NOT NULL,
	"description" text NOT NULL,
	"responsible_id" text,
	"responsible_text" text,
	"target_date" date,
	"completed_at" timestamp with time zone,
	"status" "fmea_action_status" DEFAULT 'OPEN' NOT NULL,
	"verification_of_effectiveness" text,
	"verified_at" timestamp with time zone,
	"verified_by_id" text,
	"is_special_action" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fmea_action_organization_id_id_unique" UNIQUE("organization_id","id"),
	CONSTRAINT "fmea_action_target_check" CHECK ("fmea_action"."failure_mode_id" IS NOT NULL OR "fmea_action"."failure_cause_id" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "fmea_action_priority" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"method" "fmea_action_priority_method" DEFAULT 'ACTION_PRIORITY' NOT NULL,
	"severity_min" integer NOT NULL,
	"severity_max" integer NOT NULL,
	"occurrence_min" integer NOT NULL,
	"occurrence_max" integer NOT NULL,
	"detection_min" integer NOT NULL,
	"detection_max" integer NOT NULL,
	"action_priority" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fmea_action_priority_organization_id_id_unique" UNIQUE("organization_id","id"),
	CONSTRAINT "fmea_action_priority_organization_id_bands_unique" UNIQUE("organization_id","method","severity_min","severity_max","occurrence_min","occurrence_max","detection_min","detection_max")
);
--> statement-breakpoint
CREATE TABLE "fmea_control" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"fmea_document_id" uuid NOT NULL,
	"failure_cause_id" uuid NOT NULL,
	"control_type" "fmea_control_type" NOT NULL,
	"description" text NOT NULL,
	"effectiveness" "fmea_control_effectiveness" NOT NULL,
	"process_function_id" uuid,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fmea_control_organization_id_id_unique" UNIQUE("organization_id","id"),
	CONSTRAINT "fmea_control_failure_cause_id_control_type_unique" UNIQUE("failure_cause_id","control_type")
);
--> statement-breakpoint
CREATE TABLE "fmea_document" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"process_variant_revision_id" uuid NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"fmea_type" "fmea_type" DEFAULT 'PFMEA' NOT NULL,
	"status" "fmea_document_status" DEFAULT 'DRAFT' NOT NULL,
	"evaluation_method" "fmea_evaluation_method" DEFAULT 'BOTH' NOT NULL,
	"scope_description" text,
	"responsibility" text,
	"target_date" date,
	"version" integer DEFAULT 1 NOT NULL,
	"submitted_at" timestamp with time zone,
	"submitted_by_id" text,
	"approved_at" timestamp with time zone,
	"approved_by_id" text,
	"released_at" timestamp with time zone,
	"released_by_id" text,
	"created_by_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fmea_document_organization_id_id_unique" UNIQUE("organization_id","id"),
	CONSTRAINT "fmea_document_revision_id_fmea_type_unique" UNIQUE("process_variant_revision_id","fmea_type")
);
--> statement-breakpoint
CREATE TABLE "fmea_failure_cause" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"fmea_document_id" uuid NOT NULL,
	"failure_mode_id" uuid NOT NULL,
	"cause" text NOT NULL,
	"cause_category" "fmea_cause_category" DEFAULT 'OTHER' NOT NULL,
	"process_work_element_id" uuid,
	"process_function_id" uuid,
	"occurrence" integer NOT NULL,
	"detection" integer NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fmea_failure_cause_organization_id_id_unique" UNIQUE("organization_id","id"),
	CONSTRAINT "fmea_failure_cause_occurrence_check" CHECK ("fmea_failure_cause"."occurrence" between 1 and 10),
	CONSTRAINT "fmea_failure_cause_detection_check" CHECK ("fmea_failure_cause"."detection" between 1 and 10)
);
--> statement-breakpoint
CREATE TABLE "fmea_failure_mode" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"fmea_document_id" uuid NOT NULL,
	"structure_element_id" uuid NOT NULL,
	"function_id" uuid,
	"failure_mode" text NOT NULL,
	"failure_effect_local" text,
	"failure_effect_end" text,
	"severity" integer NOT NULL,
	"severity_classification" "fmea_severity_classification" DEFAULT 'NONE' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fmea_failure_mode_organization_id_id_unique" UNIQUE("organization_id","id"),
	CONSTRAINT "fmea_failure_mode_severity_check" CHECK ("fmea_failure_mode"."severity" between 1 and 10)
);
--> statement-breakpoint
CREATE TABLE "fmea_function" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"fmea_document_id" uuid NOT NULL,
	"structure_element_id" uuid,
	"process_function_id" uuid,
	"name" text NOT NULL,
	"description" text,
	"function_aspect" "fmea_function_aspect" DEFAULT 'PURPOSE' NOT NULL,
	"requirement_text" text,
	"is_special_characteristic" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fmea_function_organization_id_id_unique" UNIQUE("organization_id","id")
);
--> statement-breakpoint
CREATE TABLE "fmea_risk_matrix" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"method" "fmea_risk_method" DEFAULT 'RISK_CLASS' NOT NULL,
	"severity" integer NOT NULL,
	"occurrence" integer NOT NULL,
	"risk_class" text NOT NULL,
	"risk_priority" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fmea_risk_matrix_organization_id_id_unique" UNIQUE("organization_id","id"),
	CONSTRAINT "fmea_risk_matrix_organization_id_severity_occurrence_unique" UNIQUE("organization_id","severity","occurrence")
);
--> statement-breakpoint
CREATE TABLE "fmea_special_characteristic" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"fmea_document_id" uuid NOT NULL,
	"structure_element_id" uuid,
	"function_id" uuid,
	"failure_mode_id" uuid,
	"characteristic_type" "fmea_characteristic_type" NOT NULL,
	"sc_class" text,
	"reason" text,
	"status" "fmea_characteristic_status" DEFAULT 'OPEN' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fmea_special_characteristic_organization_id_id_unique" UNIQUE("organization_id","id"),
	CONSTRAINT "fmea_special_characteristic_target_check" CHECK ("fmea_special_characteristic"."structure_element_id" IS NOT NULL OR "fmea_special_characteristic"."function_id" IS NOT NULL OR "fmea_special_characteristic"."failure_mode_id" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "fmea_structure_element" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"fmea_document_id" uuid NOT NULL,
	"parent_id" uuid,
	"level" "fmea_structure_level" DEFAULT 'COMPONENT' NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"flow_node_id" uuid,
	"item_id" uuid,
	"process_work_element_id" uuid,
	"is_special_characteristic" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fmea_structure_element_organization_id_id_unique" UNIQUE("organization_id","id"),
	CONSTRAINT "fmea_structure_element_organization_id_document_id_id_unique" UNIQUE("organization_id","fmea_document_id","id"),
	CONSTRAINT "fmea_structure_element_parent_not_self_check" CHECK ("fmea_structure_element"."parent_id" IS NULL OR "fmea_structure_element"."parent_id" <> "fmea_structure_element"."id"),
	CONSTRAINT "fmea_structure_element_single_source_check" CHECK ((("fmea_structure_element"."flow_node_id" IS NOT NULL)::int + ("fmea_structure_element"."item_id" IS NOT NULL)::int + ("fmea_structure_element"."process_work_element_id" IS NOT NULL)::int) <= 1)
);
--> statement-breakpoint
ALTER TABLE "fmea_action" ADD CONSTRAINT "fmea_action_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fmea_action" ADD CONSTRAINT "fmea_action_responsible_id_user_id_fk" FOREIGN KEY ("responsible_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fmea_action" ADD CONSTRAINT "fmea_action_verified_by_id_user_id_fk" FOREIGN KEY ("verified_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fmea_action" ADD CONSTRAINT "fmea_action_document_org_fk" FOREIGN KEY ("organization_id","fmea_document_id") REFERENCES "public"."fmea_document"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fmea_action" ADD CONSTRAINT "fmea_action_failure_mode_org_fk" FOREIGN KEY ("organization_id","failure_mode_id") REFERENCES "public"."fmea_failure_mode"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fmea_action" ADD CONSTRAINT "fmea_action_failure_cause_org_fk" FOREIGN KEY ("organization_id","failure_cause_id") REFERENCES "public"."fmea_failure_cause"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fmea_action_priority" ADD CONSTRAINT "fmea_action_priority_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fmea_action_priority" ADD CONSTRAINT "fmea_action_priority_organization_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fmea_control" ADD CONSTRAINT "fmea_control_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fmea_control" ADD CONSTRAINT "fmea_control_document_org_fk" FOREIGN KEY ("organization_id","fmea_document_id") REFERENCES "public"."fmea_document"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fmea_control" ADD CONSTRAINT "fmea_control_failure_cause_org_fk" FOREIGN KEY ("organization_id","failure_cause_id") REFERENCES "public"."fmea_failure_cause"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fmea_control" ADD CONSTRAINT "fmea_control_process_function_org_fk" FOREIGN KEY ("organization_id","process_function_id") REFERENCES "public"."process_function"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fmea_document" ADD CONSTRAINT "fmea_document_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fmea_document" ADD CONSTRAINT "fmea_document_submitted_by_id_user_id_fk" FOREIGN KEY ("submitted_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fmea_document" ADD CONSTRAINT "fmea_document_approved_by_id_user_id_fk" FOREIGN KEY ("approved_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fmea_document" ADD CONSTRAINT "fmea_document_released_by_id_user_id_fk" FOREIGN KEY ("released_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fmea_document" ADD CONSTRAINT "fmea_document_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fmea_document" ADD CONSTRAINT "fmea_document_revision_org_fk" FOREIGN KEY ("organization_id","process_variant_revision_id") REFERENCES "public"."process_variant_revision"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fmea_failure_cause" ADD CONSTRAINT "fmea_failure_cause_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fmea_failure_cause" ADD CONSTRAINT "fmea_failure_cause_document_org_fk" FOREIGN KEY ("organization_id","fmea_document_id") REFERENCES "public"."fmea_document"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fmea_failure_cause" ADD CONSTRAINT "fmea_failure_cause_failure_mode_org_fk" FOREIGN KEY ("organization_id","failure_mode_id") REFERENCES "public"."fmea_failure_mode"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fmea_failure_cause" ADD CONSTRAINT "fmea_failure_cause_work_element_org_fk" FOREIGN KEY ("organization_id","process_work_element_id") REFERENCES "public"."process_work_element"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fmea_failure_cause" ADD CONSTRAINT "fmea_failure_cause_process_function_org_fk" FOREIGN KEY ("organization_id","process_function_id") REFERENCES "public"."process_function"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fmea_failure_mode" ADD CONSTRAINT "fmea_failure_mode_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fmea_failure_mode" ADD CONSTRAINT "fmea_failure_mode_document_org_fk" FOREIGN KEY ("organization_id","fmea_document_id") REFERENCES "public"."fmea_document"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fmea_failure_mode" ADD CONSTRAINT "fmea_failure_mode_structure_element_org_fk" FOREIGN KEY ("organization_id","structure_element_id") REFERENCES "public"."fmea_structure_element"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fmea_failure_mode" ADD CONSTRAINT "fmea_failure_mode_function_org_fk" FOREIGN KEY ("organization_id","function_id") REFERENCES "public"."fmea_function"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fmea_function" ADD CONSTRAINT "fmea_function_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fmea_function" ADD CONSTRAINT "fmea_function_document_org_fk" FOREIGN KEY ("organization_id","fmea_document_id") REFERENCES "public"."fmea_document"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fmea_function" ADD CONSTRAINT "fmea_function_structure_element_org_fk" FOREIGN KEY ("organization_id","structure_element_id") REFERENCES "public"."fmea_structure_element"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fmea_function" ADD CONSTRAINT "fmea_function_process_function_org_fk" FOREIGN KEY ("organization_id","process_function_id") REFERENCES "public"."process_function"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fmea_risk_matrix" ADD CONSTRAINT "fmea_risk_matrix_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fmea_special_characteristic" ADD CONSTRAINT "fmea_special_characteristic_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fmea_special_characteristic" ADD CONSTRAINT "fmea_special_characteristic_document_org_fk" FOREIGN KEY ("organization_id","fmea_document_id") REFERENCES "public"."fmea_document"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fmea_special_characteristic" ADD CONSTRAINT "fmea_special_characteristic_structure_element_org_fk" FOREIGN KEY ("organization_id","structure_element_id") REFERENCES "public"."fmea_structure_element"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fmea_special_characteristic" ADD CONSTRAINT "fmea_special_characteristic_function_org_fk" FOREIGN KEY ("organization_id","function_id") REFERENCES "public"."fmea_function"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fmea_special_characteristic" ADD CONSTRAINT "fmea_special_characteristic_failure_mode_org_fk" FOREIGN KEY ("organization_id","failure_mode_id") REFERENCES "public"."fmea_failure_mode"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fmea_structure_element" ADD CONSTRAINT "fmea_structure_element_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fmea_structure_element" ADD CONSTRAINT "fmea_structure_element_document_org_fk" FOREIGN KEY ("organization_id","fmea_document_id") REFERENCES "public"."fmea_document"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fmea_structure_element" ADD CONSTRAINT "fmea_structure_element_parent_org_fk" FOREIGN KEY ("organization_id","fmea_document_id","parent_id") REFERENCES "public"."fmea_structure_element"("organization_id","fmea_document_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fmea_structure_element" ADD CONSTRAINT "fmea_structure_element_flow_node_org_fk" FOREIGN KEY ("organization_id","flow_node_id") REFERENCES "public"."flow_node"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fmea_structure_element" ADD CONSTRAINT "fmea_structure_element_item_org_fk" FOREIGN KEY ("organization_id","item_id") REFERENCES "public"."item"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fmea_structure_element" ADD CONSTRAINT "fmea_structure_element_work_element_org_fk" FOREIGN KEY ("organization_id","process_work_element_id") REFERENCES "public"."process_work_element"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "fmea_action_organization_id_idx" ON "fmea_action" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "fmea_action_document_id_idx" ON "fmea_action" USING btree ("fmea_document_id");--> statement-breakpoint
CREATE INDEX "fmea_action_failure_mode_id_idx" ON "fmea_action" USING btree ("failure_mode_id");--> statement-breakpoint
CREATE INDEX "fmea_action_failure_cause_id_idx" ON "fmea_action" USING btree ("failure_cause_id");--> statement-breakpoint
CREATE INDEX "fmea_action_status_idx" ON "fmea_action" USING btree ("status");--> statement-breakpoint
CREATE INDEX "fmea_action_priority_organization_id_idx" ON "fmea_action_priority" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "fmea_action_priority_method_idx" ON "fmea_action_priority" USING btree ("method");--> statement-breakpoint
CREATE INDEX "fmea_control_organization_id_idx" ON "fmea_control" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "fmea_control_document_id_idx" ON "fmea_control" USING btree ("fmea_document_id");--> statement-breakpoint
CREATE INDEX "fmea_control_failure_cause_id_idx" ON "fmea_control" USING btree ("failure_cause_id");--> statement-breakpoint
CREATE UNIQUE INDEX "fmea_document_organization_id_code_lower_uidx" ON "fmea_document" USING btree ("organization_id",lower("code"));--> statement-breakpoint
CREATE INDEX "fmea_document_organization_id_idx" ON "fmea_document" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "fmea_document_revision_id_idx" ON "fmea_document" USING btree ("process_variant_revision_id");--> statement-breakpoint
CREATE INDEX "fmea_document_fmea_type_idx" ON "fmea_document" USING btree ("fmea_type");--> statement-breakpoint
CREATE INDEX "fmea_document_status_idx" ON "fmea_document" USING btree ("status");--> statement-breakpoint
CREATE INDEX "fmea_failure_cause_organization_id_idx" ON "fmea_failure_cause" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "fmea_failure_cause_document_id_idx" ON "fmea_failure_cause" USING btree ("fmea_document_id");--> statement-breakpoint
CREATE INDEX "fmea_failure_cause_failure_mode_id_idx" ON "fmea_failure_cause" USING btree ("failure_mode_id");--> statement-breakpoint
CREATE INDEX "fmea_failure_cause_cause_category_idx" ON "fmea_failure_cause" USING btree ("cause_category");--> statement-breakpoint
CREATE INDEX "fmea_failure_mode_organization_id_idx" ON "fmea_failure_mode" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "fmea_failure_mode_document_id_idx" ON "fmea_failure_mode" USING btree ("fmea_document_id");--> statement-breakpoint
CREATE INDEX "fmea_failure_mode_structure_element_id_idx" ON "fmea_failure_mode" USING btree ("structure_element_id");--> statement-breakpoint
CREATE INDEX "fmea_failure_mode_function_id_idx" ON "fmea_failure_mode" USING btree ("function_id");--> statement-breakpoint
CREATE INDEX "fmea_function_organization_id_idx" ON "fmea_function" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "fmea_function_document_id_idx" ON "fmea_function" USING btree ("fmea_document_id");--> statement-breakpoint
CREATE INDEX "fmea_function_structure_element_id_idx" ON "fmea_function" USING btree ("structure_element_id");--> statement-breakpoint
CREATE INDEX "fmea_function_process_function_id_idx" ON "fmea_function" USING btree ("process_function_id");--> statement-breakpoint
CREATE INDEX "fmea_risk_matrix_organization_id_idx" ON "fmea_risk_matrix" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "fmea_risk_matrix_method_idx" ON "fmea_risk_matrix" USING btree ("method");--> statement-breakpoint
CREATE INDEX "fmea_special_characteristic_organization_id_idx" ON "fmea_special_characteristic" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "fmea_special_characteristic_document_id_idx" ON "fmea_special_characteristic" USING btree ("fmea_document_id");--> statement-breakpoint
CREATE INDEX "fmea_special_characteristic_status_idx" ON "fmea_special_characteristic" USING btree ("status");--> statement-breakpoint
CREATE INDEX "fmea_structure_element_organization_id_idx" ON "fmea_structure_element" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "fmea_structure_element_document_id_idx" ON "fmea_structure_element" USING btree ("fmea_document_id");--> statement-breakpoint
CREATE INDEX "fmea_structure_element_parent_id_idx" ON "fmea_structure_element" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "fmea_structure_element_flow_node_id_idx" ON "fmea_structure_element" USING btree ("flow_node_id");--> statement-breakpoint
CREATE INDEX "fmea_structure_element_item_id_idx" ON "fmea_structure_element" USING btree ("item_id");