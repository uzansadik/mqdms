CREATE TYPE "public"."bom_revision_status" AS ENUM('DRAFT', 'IN_REVIEW', 'RELEASED', 'SUPERSEDED');--> statement-breakpoint
CREATE TYPE "public"."bom_type" AS ENUM('MANUFACTURING', 'ENGINEERING', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."import_status" AS ENUM('PENDING', 'PARSING', 'VALIDATING', 'READY', 'CONFLICT', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."import_type" AS ENUM('ITEM', 'ITEM_GROUP_MAPPING', 'CUSTOMER_ITEM', 'BOM');--> statement-breakpoint
CREATE TYPE "public"."item_type" AS ENUM('FINISHED_GOOD', 'SEMI_FINISHED', 'RAW_MATERIAL', 'COMPONENT', 'CONSUMABLE', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."joining_method" AS ENUM('BONDING', 'BOLTING', 'WELDING', 'RIVETING', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."project_item_role" AS ENUM('DELIVERABLE', 'COMPONENT', 'RAW_MATERIAL', 'AUXILIARY');--> statement-breakpoint
CREATE TYPE "public"."record_status" AS ENUM('ACTIVE', 'INACTIVE');--> statement-breakpoint
CREATE TYPE "public"."revision_status" AS ENUM('DRAFT', 'RELEASED', 'SUPERSEDED');--> statement-breakpoint
CREATE TYPE "public"."supply_type" AS ENUM('MANUFACTURED', 'PURCHASED', 'OUTSOURCED', 'MIXED', 'UNKNOWN');--> statement-breakpoint
CREATE TYPE "public"."unit_dimension" AS ENUM('MASS', 'LENGTH', 'AREA', 'VOLUME', 'COUNT', 'OTHER');--> statement-breakpoint
CREATE TABLE "bom" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"item_id" uuid NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"bom_type" "bom_type" DEFAULT 'MANUFACTURING' NOT NULL,
	"status" "record_status" DEFAULT 'ACTIVE' NOT NULL,
	"created_by_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	CONSTRAINT "bom_organization_id_id_unique" UNIQUE("organization_id","id")
);
--> statement-breakpoint
CREATE TABLE "bom_line" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"bom_revision_id" uuid NOT NULL,
	"child_item_id" uuid NOT NULL,
	"child_item_revision_id" uuid,
	"child_bom_revision_id" uuid,
	"line_number" integer NOT NULL,
	"quantity" numeric(18, 6) NOT NULL,
	"unit_of_measure_id" uuid,
	"description" text,
	"reference_designation" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"joining_method" "joining_method",
	"notes" text,
	"position_reference" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bom_line_organization_id_id_unique" UNIQUE("organization_id","id"),
	CONSTRAINT "bom_line_quantity_check" CHECK ("bom_line"."quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE "bom_revision" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"bom_id" uuid NOT NULL,
	"parent_item_revision_id" uuid,
	"revision" text NOT NULL,
	"description" text,
	"change_reason" text,
	"status" "bom_revision_status" DEFAULT 'DRAFT' NOT NULL,
	"effective_from" date,
	"source_system" text,
	"source_revision" text,
	"created_by_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"released_at" timestamp with time zone,
	"released_by_id" text,
	"supersedes_revision_id" uuid,
	CONSTRAINT "bom_revision_organization_id_id_unique" UNIQUE("organization_id","id")
);
--> statement-breakpoint
CREATE TABLE "customer_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"customer_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"customer_part_number" text NOT NULL,
	"customer_part_name" text,
	"description" text,
	"scope" text DEFAULT '' NOT NULL,
	"status" "record_status" DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	CONSTRAINT "customer_item_organization_id_id_unique" UNIQUE("organization_id","id")
);
--> statement-breakpoint
CREATE TABLE "customer_item_revision" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"customer_item_id" uuid NOT NULL,
	"customer_revision" text NOT NULL,
	"internal_item_revision_id" uuid,
	"drawing_reference" text,
	"drawing_revision" text,
	"description" text,
	"status" "revision_status" DEFAULT 'DRAFT' NOT NULL,
	"effective_from" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customer_item_revision_organization_id_id_unique" UNIQUE("organization_id","id")
);
--> statement-breakpoint
CREATE TABLE "import_job" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"import_type" "import_type" NOT NULL,
	"source_system" text,
	"file_name" text NOT NULL,
	"file_hash" text NOT NULL,
	"file_key" text,
	"status" "import_status" DEFAULT 'PENDING' NOT NULL,
	"column_mapping" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"total_rows" integer DEFAULT 0 NOT NULL,
	"created_count" integer DEFAULT 0 NOT NULL,
	"updated_count" integer DEFAULT 0 NOT NULL,
	"skipped_count" integer DEFAULT 0 NOT NULL,
	"error_count" integer DEFAULT 0 NOT NULL,
	"created_by_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "import_job_organization_id_id_unique" UNIQUE("organization_id","id")
);
--> statement-breakpoint
CREATE TABLE "import_job_error" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"import_job_id" uuid NOT NULL,
	"row_number" integer,
	"column" text,
	"code" text NOT NULL,
	"message" text NOT NULL,
	"context" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"item_group_id" uuid,
	"item_type" "item_type" NOT NULL,
	"supply_type" "supply_type",
	"unit_of_measure_id" uuid NOT NULL,
	"status" "record_status" DEFAULT 'ACTIVE' NOT NULL,
	"created_by_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	CONSTRAINT "item_organization_id_id_unique" UNIQUE("organization_id","id")
);
--> statement-breakpoint
CREATE TABLE "item_external_reference" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"item_id" uuid NOT NULL,
	"source_system" text NOT NULL,
	"source_instance_key" text NOT NULL,
	"external_id" text,
	"external_code" text,
	"last_imported_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "item_external_reference_organization_id_id_unique" UNIQUE("organization_id","id")
);
--> statement-breakpoint
CREATE TABLE "item_group" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"parent_id" uuid,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"status" "record_status" DEFAULT 'ACTIVE' NOT NULL,
	"created_by_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	CONSTRAINT "item_group_organization_id_id_unique" UNIQUE("organization_id","id")
);
--> statement-breakpoint
CREATE TABLE "item_revision" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"item_id" uuid NOT NULL,
	"revision" text NOT NULL,
	"description" text,
	"change_reason" text,
	"status" "revision_status" DEFAULT 'DRAFT' NOT NULL,
	"source_reference" text,
	"effective_from" date,
	"created_by_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"released_at" timestamp with time zone,
	"released_by_id" text,
	"supersedes_revision_id" uuid,
	CONSTRAINT "item_revision_organization_id_id_unique" UNIQUE("organization_id","id")
);
--> statement-breakpoint
CREATE TABLE "project_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"project_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"item_revision_id" uuid,
	"customer_item_id" uuid,
	"customer_item_revision_id" uuid,
	"bom_revision_id" uuid,
	"item_role" "project_item_role" DEFAULT 'COMPONENT' NOT NULL,
	"supply_type_override" "supply_type",
	"description" text,
	"status" "record_status" DEFAULT 'ACTIVE' NOT NULL,
	"created_by_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	CONSTRAINT "project_item_organization_id_id_unique" UNIQUE("organization_id","id")
);
--> statement-breakpoint
CREATE TABLE "item_unit" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"dimension" "unit_dimension" NOT NULL,
	"decimal_places" integer DEFAULT 0 NOT NULL,
	"conversion_factor" numeric(18, 6),
	"status" "record_status" DEFAULT 'ACTIVE' NOT NULL,
	"created_by_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	CONSTRAINT "item_unit_organization_id_id_unique" UNIQUE("organization_id","id")
);
--> statement-breakpoint
ALTER TABLE "bom" ADD CONSTRAINT "bom_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bom" ADD CONSTRAINT "bom_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bom" ADD CONSTRAINT "bom_item_org_fk" FOREIGN KEY ("organization_id","item_id") REFERENCES "public"."item"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bom_line" ADD CONSTRAINT "bom_line_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bom_line" ADD CONSTRAINT "bom_line_bom_revision_org_fk" FOREIGN KEY ("organization_id","bom_revision_id") REFERENCES "public"."bom_revision"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bom_line" ADD CONSTRAINT "bom_line_child_item_org_fk" FOREIGN KEY ("organization_id","child_item_id") REFERENCES "public"."item"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bom_line" ADD CONSTRAINT "bom_line_child_item_revision_org_fk" FOREIGN KEY ("organization_id","child_item_revision_id") REFERENCES "public"."item_revision"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bom_line" ADD CONSTRAINT "bom_line_child_bom_revision_org_fk" FOREIGN KEY ("organization_id","child_bom_revision_id") REFERENCES "public"."bom_revision"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bom_line" ADD CONSTRAINT "bom_line_unit_org_fk" FOREIGN KEY ("organization_id","unit_of_measure_id") REFERENCES "public"."item_unit"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bom_revision" ADD CONSTRAINT "bom_revision_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bom_revision" ADD CONSTRAINT "bom_revision_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bom_revision" ADD CONSTRAINT "bom_revision_released_by_id_user_id_fk" FOREIGN KEY ("released_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bom_revision" ADD CONSTRAINT "bom_revision_bom_org_fk" FOREIGN KEY ("organization_id","bom_id") REFERENCES "public"."bom"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bom_revision" ADD CONSTRAINT "bom_revision_item_revision_org_fk" FOREIGN KEY ("organization_id","parent_item_revision_id") REFERENCES "public"."item_revision"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bom_revision" ADD CONSTRAINT "bom_revision_supersedes_org_fk" FOREIGN KEY ("organization_id","supersedes_revision_id") REFERENCES "public"."bom_revision"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_item" ADD CONSTRAINT "customer_item_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_item" ADD CONSTRAINT "customer_item_customer_org_fk" FOREIGN KEY ("organization_id","customer_id") REFERENCES "public"."customer"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_item" ADD CONSTRAINT "customer_item_item_org_fk" FOREIGN KEY ("organization_id","item_id") REFERENCES "public"."item"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_item_revision" ADD CONSTRAINT "customer_item_revision_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_item_revision" ADD CONSTRAINT "customer_item_revision_customer_item_org_fk" FOREIGN KEY ("organization_id","customer_item_id") REFERENCES "public"."customer_item"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_item_revision" ADD CONSTRAINT "customer_item_revision_item_revision_org_fk" FOREIGN KEY ("organization_id","internal_item_revision_id") REFERENCES "public"."item_revision"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_job" ADD CONSTRAINT "import_job_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_job" ADD CONSTRAINT "import_job_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_job_error" ADD CONSTRAINT "import_job_error_import_job_id_import_job_id_fk" FOREIGN KEY ("import_job_id") REFERENCES "public"."import_job"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item" ADD CONSTRAINT "item_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item" ADD CONSTRAINT "item_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item" ADD CONSTRAINT "item_group_org_fk" FOREIGN KEY ("organization_id","item_group_id") REFERENCES "public"."item_group"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item" ADD CONSTRAINT "item_unit_org_fk" FOREIGN KEY ("organization_id","unit_of_measure_id") REFERENCES "public"."item_unit"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_external_reference" ADD CONSTRAINT "item_external_reference_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_external_reference" ADD CONSTRAINT "item_external_reference_item_org_fk" FOREIGN KEY ("organization_id","item_id") REFERENCES "public"."item"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_group" ADD CONSTRAINT "item_group_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_group" ADD CONSTRAINT "item_group_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_group" ADD CONSTRAINT "item_group_parent_org_fk" FOREIGN KEY ("organization_id","parent_id") REFERENCES "public"."item_group"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_revision" ADD CONSTRAINT "item_revision_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_revision" ADD CONSTRAINT "item_revision_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_revision" ADD CONSTRAINT "item_revision_released_by_id_user_id_fk" FOREIGN KEY ("released_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_revision" ADD CONSTRAINT "item_revision_item_org_fk" FOREIGN KEY ("organization_id","item_id") REFERENCES "public"."item"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_revision" ADD CONSTRAINT "item_revision_supersedes_org_fk" FOREIGN KEY ("organization_id","supersedes_revision_id") REFERENCES "public"."item_revision"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_item" ADD CONSTRAINT "project_item_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_item" ADD CONSTRAINT "project_item_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_item" ADD CONSTRAINT "project_item_project_org_fk" FOREIGN KEY ("organization_id","project_id") REFERENCES "public"."project"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_item" ADD CONSTRAINT "project_item_item_org_fk" FOREIGN KEY ("organization_id","item_id") REFERENCES "public"."item"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_item" ADD CONSTRAINT "project_item_item_revision_org_fk" FOREIGN KEY ("organization_id","item_revision_id") REFERENCES "public"."item_revision"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_item" ADD CONSTRAINT "project_item_customer_item_org_fk" FOREIGN KEY ("organization_id","customer_item_id") REFERENCES "public"."customer_item"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_item" ADD CONSTRAINT "project_item_customer_item_revision_org_fk" FOREIGN KEY ("organization_id","customer_item_revision_id") REFERENCES "public"."customer_item_revision"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_item" ADD CONSTRAINT "project_item_bom_revision_org_fk" FOREIGN KEY ("organization_id","bom_revision_id") REFERENCES "public"."bom_revision"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_unit" ADD CONSTRAINT "item_unit_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_unit" ADD CONSTRAINT "item_unit_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "bom_organization_id_code_uidx" ON "bom" USING btree ("organization_id","code");--> statement-breakpoint
CREATE INDEX "bom_organization_id_idx" ON "bom" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "bom_item_id_idx" ON "bom" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "bom_archived_at_idx" ON "bom" USING btree ("archived_at");--> statement-breakpoint
CREATE UNIQUE INDEX "bom_line_bom_revision_id_line_number_uidx" ON "bom_line" USING btree ("bom_revision_id","line_number");--> statement-breakpoint
CREATE INDEX "bom_line_organization_id_idx" ON "bom_line" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "bom_line_bom_revision_id_idx" ON "bom_line" USING btree ("bom_revision_id");--> statement-breakpoint
CREATE INDEX "bom_line_child_item_id_idx" ON "bom_line" USING btree ("child_item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "bom_revision_bom_id_revision_uidx" ON "bom_revision" USING btree ("bom_id","revision");--> statement-breakpoint
CREATE INDEX "bom_revision_organization_id_idx" ON "bom_revision" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "bom_revision_bom_id_idx" ON "bom_revision" USING btree ("bom_id");--> statement-breakpoint
CREATE INDEX "bom_revision_status_idx" ON "bom_revision" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "customer_item_customer_part_number_uidx" ON "customer_item" USING btree ("customer_id",lower("customer_part_number"),"scope");--> statement-breakpoint
CREATE INDEX "customer_item_organization_id_idx" ON "customer_item" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "customer_item_customer_id_idx" ON "customer_item" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "customer_item_item_id_idx" ON "customer_item" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "customer_item_archived_at_idx" ON "customer_item" USING btree ("archived_at");--> statement-breakpoint
CREATE UNIQUE INDEX "customer_item_revision_customer_item_id_customer_revision_uidx" ON "customer_item_revision" USING btree ("customer_item_id","customer_revision");--> statement-breakpoint
CREATE INDEX "customer_item_revision_organization_id_idx" ON "customer_item_revision" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "customer_item_revision_customer_item_id_idx" ON "customer_item_revision" USING btree ("customer_item_id");--> statement-breakpoint
CREATE INDEX "customer_item_revision_internal_item_revision_id_idx" ON "customer_item_revision" USING btree ("internal_item_revision_id");--> statement-breakpoint
CREATE INDEX "import_job_file_hash_idx" ON "import_job" USING btree ("organization_id","import_type","file_hash");--> statement-breakpoint
CREATE INDEX "import_job_organization_id_idx" ON "import_job" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "import_job_status_idx" ON "import_job" USING btree ("status");--> statement-breakpoint
CREATE INDEX "import_job_error_import_job_id_idx" ON "import_job_error" USING btree ("import_job_id");--> statement-breakpoint
CREATE UNIQUE INDEX "item_organization_id_code_lower_uidx" ON "item" USING btree ("organization_id",lower("code"));--> statement-breakpoint
CREATE INDEX "item_organization_id_idx" ON "item" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "item_item_group_id_idx" ON "item" USING btree ("item_group_id");--> statement-breakpoint
CREATE INDEX "item_unit_of_measure_id_idx" ON "item" USING btree ("unit_of_measure_id");--> statement-breakpoint
CREATE INDEX "item_archived_at_idx" ON "item" USING btree ("archived_at");--> statement-breakpoint
CREATE UNIQUE INDEX "item_external_reference_identity_uidx" ON "item_external_reference" USING btree ("organization_id","source_instance_key","source_system","external_id") WHERE "item_external_reference"."external_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "item_external_reference_code_uidx" ON "item_external_reference" USING btree ("organization_id","source_instance_key","source_system","external_code") WHERE "item_external_reference"."external_code" is not null;--> statement-breakpoint
CREATE INDEX "item_external_reference_organization_id_idx" ON "item_external_reference" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "item_external_reference_item_id_idx" ON "item_external_reference" USING btree ("item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "item_group_organization_id_code_uidx" ON "item_group" USING btree ("organization_id","code");--> statement-breakpoint
CREATE INDEX "item_group_organization_id_idx" ON "item_group" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "item_group_parent_id_idx" ON "item_group" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "item_group_archived_at_idx" ON "item_group" USING btree ("archived_at");--> statement-breakpoint
CREATE UNIQUE INDEX "item_revision_item_id_revision_uidx" ON "item_revision" USING btree ("item_id","revision");--> statement-breakpoint
CREATE INDEX "item_revision_organization_id_idx" ON "item_revision" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "item_revision_item_id_idx" ON "item_revision" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "item_revision_status_idx" ON "item_revision" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "project_item_project_id_item_id_uidx" ON "project_item" USING btree ("project_id","item_id") WHERE "project_item"."archived_at" is null;--> statement-breakpoint
CREATE INDEX "project_item_organization_id_idx" ON "project_item" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "project_item_project_id_idx" ON "project_item" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_item_item_id_idx" ON "project_item" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "project_item_archived_at_idx" ON "project_item" USING btree ("archived_at");--> statement-breakpoint
CREATE UNIQUE INDEX "item_unit_organization_id_code_uidx" ON "item_unit" USING btree ("organization_id","code");--> statement-breakpoint
CREATE INDEX "item_unit_organization_id_idx" ON "item_unit" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "item_unit_dimension_idx" ON "item_unit" USING btree ("dimension");--> statement-breakpoint
CREATE INDEX "item_unit_archived_at_idx" ON "item_unit" USING btree ("archived_at");