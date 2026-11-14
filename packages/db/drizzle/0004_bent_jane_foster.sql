CREATE TYPE "public"."flow_edge_type" AS ENUM('DEFAULT', 'YES', 'NO', 'OK', 'NOK', 'CONDITIONAL', 'REWORK', 'MATERIAL_FLOW');--> statement-breakpoint
CREATE TYPE "public"."flow_node_type" AS ENUM('START', 'END', 'ACTIVITY', 'INSPECTION', 'DECISION', 'STORAGE', 'TRANSPORT', 'DOCUMENT', 'SUBPROCESS', 'PROCESS_STEP_REFERENCE', 'PROCESS_FLOW_REFERENCE');--> statement-breakpoint
CREATE TYPE "public"."flow_type" AS ENUM('PROCESS_VARIANT', 'PROCESS_STEP', 'PROCESS_FLOW');--> statement-breakpoint
CREATE TYPE "public"."process_category" AS ENUM('MANUFACTURING', 'INSPECTION', 'ASSEMBLY', 'STORAGE', 'TRANSPORT', 'OUTSOURCED', 'PACKAGING', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."process_function_scope" AS ENUM('PROCESS', 'WORK_ELEMENT');--> statement-breakpoint
CREATE TYPE "public"."process_io_direction" AS ENUM('INPUT', 'OUTPUT');--> statement-breakpoint
CREATE TYPE "public"."process_io_resource_type" AS ENUM('PRODUCT', 'MATERIAL', 'SEMI_FINISHED', 'DOCUMENT', 'INFORMATION', 'TOOLING', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."process_requirement_type" AS ENUM('PRODUCT', 'PROCESS', 'CUSTOMER', 'REGULATORY', 'INTERNAL', 'DOCUMENTATION');--> statement-breakpoint
CREATE TYPE "public"."process_variant_revision_status" AS ENUM('DRAFT', 'IN_REVIEW', 'APPROVED', 'RELEASED', 'SUPERSEDED');--> statement-breakpoint
CREATE TYPE "public"."process_variant_type" AS ENUM('GENERIC', 'SPECIALIZED');--> statement-breakpoint
CREATE TYPE "public"."work_element_category" AS ENUM('MAN', 'MACHINE', 'MATERIAL', 'ENVIRONMENT');--> statement-breakpoint
CREATE TABLE "flow" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"flow_type" "flow_type" DEFAULT 'PROCESS_VARIANT' NOT NULL,
	"created_by_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "flow_organization_id_id_unique" UNIQUE("organization_id","id")
);
--> statement-breakpoint
CREATE TABLE "process_variant_revision_flow" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"process_variant_revision_id" uuid NOT NULL,
	"flow_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "process_variant_revision_flow_organization_id_id_unique" UNIQUE("organization_id","id"),
	CONSTRAINT "process_variant_revision_flow_revision_id_unique" UNIQUE("process_variant_revision_id")
);
--> statement-breakpoint
CREATE TABLE "flow_edge" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"flow_id" uuid NOT NULL,
	"logical_id" text NOT NULL,
	"derived_from_id" uuid,
	"source_node_id" uuid NOT NULL,
	"target_node_id" uuid NOT NULL,
	"source_handle" text,
	"target_handle" text,
	"label" text,
	"condition" text,
	"edge_type" "flow_edge_type" DEFAULT 'DEFAULT' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "flow_edge_organization_id_id_unique" UNIQUE("organization_id","id"),
	CONSTRAINT "flow_edge_flow_id_logical_id_unique" UNIQUE("flow_id","logical_id")
);
--> statement-breakpoint
CREATE TABLE "flow_node" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"flow_id" uuid NOT NULL,
	"logical_id" text NOT NULL,
	"derived_from_id" uuid,
	"node_type" "flow_node_type" DEFAULT 'ACTIVITY' NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"position_x" numeric(12, 2) DEFAULT '0' NOT NULL,
	"position_y" numeric(12, 2) DEFAULT '0' NOT NULL,
	"width" numeric(12, 2) DEFAULT '180' NOT NULL,
	"height" numeric(12, 2) DEFAULT '72' NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "flow_node_organization_id_id_unique" UNIQUE("organization_id","id"),
	CONSTRAINT "flow_node_flow_id_logical_id_unique" UNIQUE("flow_id","logical_id")
);
--> statement-breakpoint
CREATE TABLE "process" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category" "process_category" DEFAULT 'OTHER' NOT NULL,
	"status" "record_status" DEFAULT 'ACTIVE' NOT NULL,
	"created_by_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	CONSTRAINT "process_organization_id_id_unique" UNIQUE("organization_id","id")
);
--> statement-breakpoint
CREATE TABLE "process_variant_applicability" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"process_variant_revision_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"supply_type" "supply_type",
	"joining_method" "joining_method",
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "process_variant_applicability_organization_id_id_unique" UNIQUE("organization_id","id")
);
--> statement-breakpoint
CREATE TABLE "process_variant_applicability_item_group" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"applicability_id" uuid NOT NULL,
	"item_group_id" uuid NOT NULL,
	"include_descendants" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "process_variant_applicability_item_group_organization_id_id_unique" UNIQUE("organization_id","id"),
	CONSTRAINT "process_variant_applicability_item_group_unique" UNIQUE("applicability_id","item_group_id")
);
--> statement-breakpoint
CREATE TABLE "flow_node_function" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"flow_node_id" uuid NOT NULL,
	"process_function_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "flow_node_function_organization_id_id_unique" UNIQUE("organization_id","id"),
	CONSTRAINT "flow_node_function_node_id_function_id_unique" UNIQUE("flow_node_id","process_function_id")
);
--> statement-breakpoint
CREATE TABLE "process_function" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"process_variant_revision_id" uuid NOT NULL,
	"logical_id" text NOT NULL,
	"derived_from_id" uuid,
	"name" text NOT NULL,
	"description" text,
	"function_scope" "process_function_scope" DEFAULT 'PROCESS' NOT NULL,
	"process_work_element_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "process_function_organization_id_id_unique" UNIQUE("organization_id","id"),
	CONSTRAINT "process_function_revision_id_logical_id_unique" UNIQUE("process_variant_revision_id","logical_id")
);
--> statement-breakpoint
CREATE TABLE "process_function_requirement" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"process_function_id" uuid NOT NULL,
	"process_requirement_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "process_function_requirement_organization_id_id_unique" UNIQUE("organization_id","id"),
	CONSTRAINT "process_function_requirement_function_id_requirement_id_unique" UNIQUE("process_function_id","process_requirement_id")
);
--> statement-breakpoint
CREATE TABLE "process_io_definition" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"process_variant_revision_id" uuid NOT NULL,
	"logical_id" text NOT NULL,
	"derived_from_id" uuid,
	"direction" "process_io_direction" NOT NULL,
	"resource_type" "process_io_resource_type" DEFAULT 'MATERIAL' NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"item_group_id" uuid,
	"item_id" uuid,
	"process_state" text,
	"is_required" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "process_io_definition_organization_id_id_unique" UNIQUE("organization_id","id"),
	CONSTRAINT "process_io_definition_revision_id_logical_id_unique" UNIQUE("process_variant_revision_id","logical_id")
);
--> statement-breakpoint
CREATE TABLE "process_requirement" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"process_variant_revision_id" uuid NOT NULL,
	"logical_id" text NOT NULL,
	"derived_from_id" uuid,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"requirement_type" "process_requirement_type" DEFAULT 'PROCESS' NOT NULL,
	"source_reference" text,
	"is_mandatory" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "process_requirement_organization_id_id_unique" UNIQUE("organization_id","id"),
	CONSTRAINT "process_requirement_revision_id_logical_id_unique" UNIQUE("process_variant_revision_id","logical_id")
);
--> statement-breakpoint
CREATE TABLE "process_variant" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"process_id" uuid NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"variant_type" "process_variant_type" DEFAULT 'GENERIC' NOT NULL,
	"status" "record_status" DEFAULT 'ACTIVE' NOT NULL,
	"created_by_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	CONSTRAINT "process_variant_organization_id_id_unique" UNIQUE("organization_id","id")
);
--> statement-breakpoint
CREATE TABLE "process_variant_revision" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"process_variant_id" uuid NOT NULL,
	"revision" text NOT NULL,
	"description" text,
	"change_reason" text,
	"status" "process_variant_revision_status" DEFAULT 'DRAFT' NOT NULL,
	"source_variant_revision_id" uuid,
	"supersedes_revision_id" uuid,
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
	CONSTRAINT "process_variant_revision_organization_id_id_unique" UNIQUE("organization_id","id"),
	CONSTRAINT "process_variant_revision_variant_id_revision_unique" UNIQUE("process_variant_id","revision")
);
--> statement-breakpoint
CREATE TABLE "flow_node_work_element" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"flow_node_id" uuid NOT NULL,
	"process_work_element_id" uuid NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "flow_node_work_element_organization_id_id_unique" UNIQUE("organization_id","id"),
	CONSTRAINT "flow_node_work_element_node_id_work_element_id_unique" UNIQUE("flow_node_id","process_work_element_id")
);
--> statement-breakpoint
CREATE TABLE "process_work_element" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"process_variant_revision_id" uuid NOT NULL,
	"logical_id" text NOT NULL,
	"derived_from_id" uuid,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category" "work_element_category" NOT NULL,
	"item_id" uuid,
	"item_group_id" uuid,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "process_work_element_organization_id_id_unique" UNIQUE("organization_id","id"),
	CONSTRAINT "process_work_element_revision_id_logical_id_unique" UNIQUE("process_variant_revision_id","logical_id")
);
--> statement-breakpoint
ALTER TABLE "flow" ADD CONSTRAINT "flow_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flow" ADD CONSTRAINT "flow_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "process_variant_revision_flow" ADD CONSTRAINT "process_variant_revision_flow_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "process_variant_revision_flow" ADD CONSTRAINT "process_variant_revision_flow_revision_org_fk" FOREIGN KEY ("organization_id","process_variant_revision_id") REFERENCES "public"."process_variant_revision"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "process_variant_revision_flow" ADD CONSTRAINT "process_variant_revision_flow_flow_org_fk" FOREIGN KEY ("organization_id","flow_id") REFERENCES "public"."flow"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flow_edge" ADD CONSTRAINT "flow_edge_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flow_edge" ADD CONSTRAINT "flow_edge_flow_org_fk" FOREIGN KEY ("organization_id","flow_id") REFERENCES "public"."flow"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flow_edge" ADD CONSTRAINT "flow_edge_source_node_org_fk" FOREIGN KEY ("organization_id","source_node_id") REFERENCES "public"."flow_node"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flow_edge" ADD CONSTRAINT "flow_edge_target_node_org_fk" FOREIGN KEY ("organization_id","target_node_id") REFERENCES "public"."flow_node"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flow_edge" ADD CONSTRAINT "flow_edge_derived_from_org_fk" FOREIGN KEY ("organization_id","derived_from_id") REFERENCES "public"."flow_edge"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flow_node" ADD CONSTRAINT "flow_node_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flow_node" ADD CONSTRAINT "flow_node_flow_org_fk" FOREIGN KEY ("organization_id","flow_id") REFERENCES "public"."flow"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flow_node" ADD CONSTRAINT "flow_node_derived_from_org_fk" FOREIGN KEY ("organization_id","derived_from_id") REFERENCES "public"."flow_node"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "process" ADD CONSTRAINT "process_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "process" ADD CONSTRAINT "process_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "process_variant_applicability" ADD CONSTRAINT "process_variant_applicability_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "process_variant_applicability" ADD CONSTRAINT "process_variant_applicability_revision_org_fk" FOREIGN KEY ("organization_id","process_variant_revision_id") REFERENCES "public"."process_variant_revision"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "process_variant_applicability_item_group" ADD CONSTRAINT "process_variant_applicability_item_group_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "process_variant_applicability_item_group" ADD CONSTRAINT "process_variant_applicability_item_group_applicability_org_fk" FOREIGN KEY ("organization_id","applicability_id") REFERENCES "public"."process_variant_applicability"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "process_variant_applicability_item_group" ADD CONSTRAINT "process_variant_applicability_item_group_item_group_org_fk" FOREIGN KEY ("organization_id","item_group_id") REFERENCES "public"."item_group"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flow_node_function" ADD CONSTRAINT "flow_node_function_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flow_node_function" ADD CONSTRAINT "flow_node_function_node_org_fk" FOREIGN KEY ("organization_id","flow_node_id") REFERENCES "public"."flow_node"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flow_node_function" ADD CONSTRAINT "flow_node_function_function_org_fk" FOREIGN KEY ("organization_id","process_function_id") REFERENCES "public"."process_function"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "process_function" ADD CONSTRAINT "process_function_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "process_function" ADD CONSTRAINT "process_function_revision_org_fk" FOREIGN KEY ("organization_id","process_variant_revision_id") REFERENCES "public"."process_variant_revision"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "process_function" ADD CONSTRAINT "process_function_derived_from_org_fk" FOREIGN KEY ("organization_id","derived_from_id") REFERENCES "public"."process_function"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "process_function" ADD CONSTRAINT "process_function_work_element_org_fk" FOREIGN KEY ("organization_id","process_work_element_id") REFERENCES "public"."process_work_element"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "process_function_requirement" ADD CONSTRAINT "process_function_requirement_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "process_function_requirement" ADD CONSTRAINT "process_function_requirement_function_org_fk" FOREIGN KEY ("organization_id","process_function_id") REFERENCES "public"."process_function"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "process_function_requirement" ADD CONSTRAINT "process_function_requirement_requirement_org_fk" FOREIGN KEY ("organization_id","process_requirement_id") REFERENCES "public"."process_requirement"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "process_io_definition" ADD CONSTRAINT "process_io_definition_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "process_io_definition" ADD CONSTRAINT "process_io_definition_revision_org_fk" FOREIGN KEY ("organization_id","process_variant_revision_id") REFERENCES "public"."process_variant_revision"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "process_io_definition" ADD CONSTRAINT "process_io_definition_derived_from_org_fk" FOREIGN KEY ("organization_id","derived_from_id") REFERENCES "public"."process_io_definition"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "process_io_definition" ADD CONSTRAINT "process_io_definition_item_org_fk" FOREIGN KEY ("organization_id","item_id") REFERENCES "public"."item"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "process_io_definition" ADD CONSTRAINT "process_io_definition_item_group_org_fk" FOREIGN KEY ("organization_id","item_group_id") REFERENCES "public"."item_group"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "process_requirement" ADD CONSTRAINT "process_requirement_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "process_requirement" ADD CONSTRAINT "process_requirement_revision_org_fk" FOREIGN KEY ("organization_id","process_variant_revision_id") REFERENCES "public"."process_variant_revision"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "process_requirement" ADD CONSTRAINT "process_requirement_derived_from_org_fk" FOREIGN KEY ("organization_id","derived_from_id") REFERENCES "public"."process_requirement"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "process_variant" ADD CONSTRAINT "process_variant_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "process_variant" ADD CONSTRAINT "process_variant_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "process_variant" ADD CONSTRAINT "process_variant_process_org_fk" FOREIGN KEY ("organization_id","process_id") REFERENCES "public"."process"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "process_variant_revision" ADD CONSTRAINT "process_variant_revision_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "process_variant_revision" ADD CONSTRAINT "process_variant_revision_submitted_by_id_user_id_fk" FOREIGN KEY ("submitted_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "process_variant_revision" ADD CONSTRAINT "process_variant_revision_approved_by_id_user_id_fk" FOREIGN KEY ("approved_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "process_variant_revision" ADD CONSTRAINT "process_variant_revision_released_by_id_user_id_fk" FOREIGN KEY ("released_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "process_variant_revision" ADD CONSTRAINT "process_variant_revision_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "process_variant_revision" ADD CONSTRAINT "process_variant_revision_variant_org_fk" FOREIGN KEY ("organization_id","process_variant_id") REFERENCES "public"."process_variant"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "process_variant_revision" ADD CONSTRAINT "process_variant_revision_source_org_fk" FOREIGN KEY ("organization_id","source_variant_revision_id") REFERENCES "public"."process_variant_revision"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "process_variant_revision" ADD CONSTRAINT "process_variant_revision_supersedes_org_fk" FOREIGN KEY ("organization_id","supersedes_revision_id") REFERENCES "public"."process_variant_revision"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flow_node_work_element" ADD CONSTRAINT "flow_node_work_element_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flow_node_work_element" ADD CONSTRAINT "flow_node_work_element_node_org_fk" FOREIGN KEY ("organization_id","flow_node_id") REFERENCES "public"."flow_node"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flow_node_work_element" ADD CONSTRAINT "flow_node_work_element_work_element_org_fk" FOREIGN KEY ("organization_id","process_work_element_id") REFERENCES "public"."process_work_element"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "process_work_element" ADD CONSTRAINT "process_work_element_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "process_work_element" ADD CONSTRAINT "process_work_element_revision_org_fk" FOREIGN KEY ("organization_id","process_variant_revision_id") REFERENCES "public"."process_variant_revision"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "process_work_element" ADD CONSTRAINT "process_work_element_derived_from_org_fk" FOREIGN KEY ("organization_id","derived_from_id") REFERENCES "public"."process_work_element"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "process_work_element" ADD CONSTRAINT "process_work_element_item_org_fk" FOREIGN KEY ("organization_id","item_id") REFERENCES "public"."item"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "process_work_element" ADD CONSTRAINT "process_work_element_item_group_org_fk" FOREIGN KEY ("organization_id","item_group_id") REFERENCES "public"."item_group"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "flow_organization_id_idx" ON "flow" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "flow_flow_type_idx" ON "flow" USING btree ("flow_type");--> statement-breakpoint
CREATE INDEX "process_variant_revision_flow_organization_id_idx" ON "process_variant_revision_flow" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "process_variant_revision_flow_flow_id_idx" ON "process_variant_revision_flow" USING btree ("flow_id");--> statement-breakpoint
CREATE INDEX "flow_edge_organization_id_idx" ON "flow_edge" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "flow_edge_flow_id_idx" ON "flow_edge" USING btree ("flow_id");--> statement-breakpoint
CREATE INDEX "flow_edge_source_node_id_idx" ON "flow_edge" USING btree ("source_node_id");--> statement-breakpoint
CREATE INDEX "flow_edge_target_node_id_idx" ON "flow_edge" USING btree ("target_node_id");--> statement-breakpoint
CREATE INDEX "flow_node_organization_id_idx" ON "flow_node" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "flow_node_flow_id_idx" ON "flow_node" USING btree ("flow_id");--> statement-breakpoint
CREATE INDEX "flow_node_derived_from_id_idx" ON "flow_node" USING btree ("derived_from_id");--> statement-breakpoint
CREATE UNIQUE INDEX "process_organization_id_code_lower_uidx" ON "process" USING btree ("organization_id",lower("code"));--> statement-breakpoint
CREATE INDEX "process_organization_id_idx" ON "process" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "process_category_idx" ON "process" USING btree ("category");--> statement-breakpoint
CREATE INDEX "process_archived_at_idx" ON "process" USING btree ("archived_at");--> statement-breakpoint
CREATE INDEX "process_variant_applicability_organization_id_idx" ON "process_variant_applicability" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "process_variant_applicability_revision_id_idx" ON "process_variant_applicability" USING btree ("process_variant_revision_id");--> statement-breakpoint
CREATE INDEX "process_variant_applicability_item_group_organization_id_idx" ON "process_variant_applicability_item_group" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "process_variant_applicability_item_group_applicability_id_idx" ON "process_variant_applicability_item_group" USING btree ("applicability_id");--> statement-breakpoint
CREATE INDEX "flow_node_function_organization_id_idx" ON "flow_node_function" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "flow_node_function_flow_node_id_idx" ON "flow_node_function" USING btree ("flow_node_id");--> statement-breakpoint
CREATE INDEX "flow_node_function_function_id_idx" ON "flow_node_function" USING btree ("process_function_id");--> statement-breakpoint
CREATE INDEX "process_function_organization_id_idx" ON "process_function" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "process_function_revision_id_idx" ON "process_function" USING btree ("process_variant_revision_id");--> statement-breakpoint
CREATE INDEX "process_function_work_element_id_idx" ON "process_function" USING btree ("process_work_element_id");--> statement-breakpoint
CREATE INDEX "process_function_requirement_organization_id_idx" ON "process_function_requirement" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "process_function_requirement_function_id_idx" ON "process_function_requirement" USING btree ("process_function_id");--> statement-breakpoint
CREATE INDEX "process_io_definition_organization_id_idx" ON "process_io_definition" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "process_io_definition_revision_id_idx" ON "process_io_definition" USING btree ("process_variant_revision_id");--> statement-breakpoint
CREATE INDEX "process_io_definition_direction_idx" ON "process_io_definition" USING btree ("direction");--> statement-breakpoint
CREATE INDEX "process_requirement_organization_id_idx" ON "process_requirement" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "process_requirement_revision_id_idx" ON "process_requirement" USING btree ("process_variant_revision_id");--> statement-breakpoint
CREATE INDEX "process_requirement_requirement_type_idx" ON "process_requirement" USING btree ("requirement_type");--> statement-breakpoint
CREATE UNIQUE INDEX "process_variant_organization_id_code_lower_uidx" ON "process_variant" USING btree ("organization_id",lower("code"));--> statement-breakpoint
CREATE INDEX "process_variant_organization_id_idx" ON "process_variant" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "process_variant_process_id_idx" ON "process_variant" USING btree ("process_id");--> statement-breakpoint
CREATE INDEX "process_variant_archived_at_idx" ON "process_variant" USING btree ("archived_at");--> statement-breakpoint
CREATE INDEX "process_variant_revision_organization_id_idx" ON "process_variant_revision" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "process_variant_revision_variant_id_idx" ON "process_variant_revision" USING btree ("process_variant_id");--> statement-breakpoint
CREATE INDEX "process_variant_revision_status_idx" ON "process_variant_revision" USING btree ("status");--> statement-breakpoint
CREATE INDEX "process_variant_revision_source_variant_revision_id_idx" ON "process_variant_revision" USING btree ("source_variant_revision_id");--> statement-breakpoint
CREATE INDEX "flow_node_work_element_organization_id_idx" ON "flow_node_work_element" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "flow_node_work_element_flow_node_id_idx" ON "flow_node_work_element" USING btree ("flow_node_id");--> statement-breakpoint
CREATE INDEX "flow_node_work_element_work_element_id_idx" ON "flow_node_work_element" USING btree ("process_work_element_id");--> statement-breakpoint
CREATE INDEX "process_work_element_organization_id_idx" ON "process_work_element" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "process_work_element_revision_id_idx" ON "process_work_element" USING btree ("process_variant_revision_id");--> statement-breakpoint
CREATE INDEX "process_work_element_category_idx" ON "process_work_element" USING btree ("category");--> statement-breakpoint
CREATE INDEX "process_work_element_derived_from_id_idx" ON "process_work_element" USING btree ("derived_from_id");