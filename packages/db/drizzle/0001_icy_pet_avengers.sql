CREATE TYPE "public"."customer_contact_type" AS ENUM('QUALITY', 'PROJECT', 'PURCHASING', 'ENGINEERING', 'LOGISTICS', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."customer_status" AS ENUM('ACTIVE', 'INACTIVE');--> statement-breakpoint
CREATE TYPE "public"."plant_status" AS ENUM('ACTIVE', 'INACTIVE');--> statement-breakpoint
CREATE TYPE "public"."project_role" AS ENUM('PROJECT_MANAGER', 'PROJECT_ENGINEER', 'QUALITY_MANAGER', 'QUALITY_ENGINEER', 'PROCESS_ENGINEER', 'PRODUCTION_RESPONSIBLE', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."project_status" AS ENUM('DRAFT', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED');--> statement-breakpoint
CREATE TABLE "customer" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"legal_name" text,
	"description" text,
	"website" text,
	"country_code" text,
	"preferred_language" text,
	"status" "customer_status" DEFAULT 'ACTIVE' NOT NULL,
	"created_by_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	CONSTRAINT "customer_organization_id_id_unique" UNIQUE("organization_id","id"),
	CONSTRAINT "customer_organization_id_code_unique" UNIQUE("organization_id","code")
);
--> statement-breakpoint
CREATE TABLE "customer_contact" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"customer_id" uuid NOT NULL,
	"customer_site_id" uuid,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"job_title" text,
	"department" text,
	"email" text,
	"phone" text,
	"contact_type" "customer_contact_type" DEFAULT 'OTHER' NOT NULL,
	"notes" text,
	"status" "customer_status" DEFAULT 'ACTIVE' NOT NULL,
	"created_by_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	CONSTRAINT "customer_contact_organization_id_id_unique" UNIQUE("organization_id","id")
);
--> statement-breakpoint
CREATE TABLE "customer_site" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"customer_id" uuid NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"country_code" text,
	"city" text,
	"address" text,
	"postal_code" text,
	"description" text,
	"status" "customer_status" DEFAULT 'ACTIVE' NOT NULL,
	"created_by_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	CONSTRAINT "customer_site_organization_id_id_unique" UNIQUE("organization_id","id"),
	CONSTRAINT "customer_site_customer_id_code_unique" UNIQUE("customer_id","code"),
	CONSTRAINT "customer_site_customer_id_id_unique" UNIQUE("customer_id","id")
);
--> statement-breakpoint
CREATE TABLE "plant" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"country_code" text,
	"city" text,
	"address" text,
	"postal_code" text,
	"timezone" text,
	"status" "plant_status" DEFAULT 'ACTIVE' NOT NULL,
	"created_by_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	CONSTRAINT "plant_organization_id_id_unique" UNIQUE("organization_id","id"),
	CONSTRAINT "plant_organization_id_code_unique" UNIQUE("organization_id","code")
);
--> statement-breakpoint
CREATE TABLE "project" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"customer_id" uuid NOT NULL,
	"customer_site_id" uuid,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"customer_project_code" text,
	"description" text,
	"status" "project_status" DEFAULT 'DRAFT' NOT NULL,
	"project_manager_member_id" text,
	"start_date" date,
	"target_completion_date" date,
	"actual_completion_date" date,
	"created_by_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	CONSTRAINT "project_organization_id_id_unique" UNIQUE("organization_id","id"),
	CONSTRAINT "project_organization_id_code_unique" UNIQUE("organization_id","code")
);
--> statement-breakpoint
CREATE TABLE "project_member" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"project_id" uuid NOT NULL,
	"member_id" text NOT NULL,
	"project_role" "project_role" DEFAULT 'OTHER' NOT NULL,
	"responsibility" text,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"removed_at" timestamp with time zone,
	CONSTRAINT "project_member_organization_id_id_unique" UNIQUE("organization_id","id")
);
--> statement-breakpoint
CREATE TABLE "project_plant" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"project_id" uuid NOT NULL,
	"plant_id" uuid NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_plant_project_id_plant_id_unique" UNIQUE("project_id","plant_id")
);
--> statement-breakpoint
ALTER TABLE "organization_role" ADD COLUMN "seed_version" text DEFAULT '1' NOT NULL;--> statement-breakpoint
ALTER TABLE "customer" ADD CONSTRAINT "customer_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer" ADD CONSTRAINT "customer_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_contact" ADD CONSTRAINT "customer_contact_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_contact" ADD CONSTRAINT "customer_contact_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_contact" ADD CONSTRAINT "customer_contact_customer_org_fk" FOREIGN KEY ("organization_id","customer_id") REFERENCES "public"."customer"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_contact" ADD CONSTRAINT "customer_contact_site_customer_fk" FOREIGN KEY ("customer_id","customer_site_id") REFERENCES "public"."customer_site"("customer_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_site" ADD CONSTRAINT "customer_site_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_site" ADD CONSTRAINT "customer_site_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_site" ADD CONSTRAINT "customer_site_customer_org_fk" FOREIGN KEY ("organization_id","customer_id") REFERENCES "public"."customer"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plant" ADD CONSTRAINT "plant_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plant" ADD CONSTRAINT "plant_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_project_manager_member_id_member_id_fk" FOREIGN KEY ("project_manager_member_id") REFERENCES "public"."member"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_customer_org_fk" FOREIGN KEY ("organization_id","customer_id") REFERENCES "public"."customer"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_site_customer_fk" FOREIGN KEY ("customer_id","customer_site_id") REFERENCES "public"."customer_site"("customer_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_member" ADD CONSTRAINT "project_member_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_member" ADD CONSTRAINT "project_member_project_org_fk" FOREIGN KEY ("organization_id","project_id") REFERENCES "public"."project"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_member" ADD CONSTRAINT "project_member_member_org_fk" FOREIGN KEY ("organization_id","member_id") REFERENCES "public"."member"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_plant" ADD CONSTRAINT "project_plant_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_plant" ADD CONSTRAINT "project_plant_project_org_fk" FOREIGN KEY ("organization_id","project_id") REFERENCES "public"."project"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_plant" ADD CONSTRAINT "project_plant_plant_org_fk" FOREIGN KEY ("organization_id","plant_id") REFERENCES "public"."plant"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "customer_organization_id_idx" ON "customer" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "customer_archived_at_idx" ON "customer" USING btree ("archived_at");--> statement-breakpoint
CREATE INDEX "customer_contact_organization_id_idx" ON "customer_contact" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "customer_contact_customer_id_idx" ON "customer_contact" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "customer_contact_customer_site_id_idx" ON "customer_contact" USING btree ("customer_site_id");--> statement-breakpoint
CREATE INDEX "customer_contact_archived_at_idx" ON "customer_contact" USING btree ("archived_at");--> statement-breakpoint
CREATE INDEX "customer_site_organization_id_idx" ON "customer_site" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "customer_site_customer_id_idx" ON "customer_site" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "customer_site_archived_at_idx" ON "customer_site" USING btree ("archived_at");--> statement-breakpoint
CREATE INDEX "plant_organization_id_idx" ON "plant" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "plant_archived_at_idx" ON "plant" USING btree ("archived_at");--> statement-breakpoint
CREATE INDEX "project_organization_id_idx" ON "project" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "project_customer_id_idx" ON "project" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "project_status_idx" ON "project" USING btree ("status");--> statement-breakpoint
CREATE INDEX "project_archived_at_idx" ON "project" USING btree ("archived_at");--> statement-breakpoint
CREATE UNIQUE INDEX "project_member_project_id_member_id_uidx" ON "project_member" USING btree ("project_id","member_id") WHERE "project_member"."removed_at" is null;--> statement-breakpoint
CREATE INDEX "project_member_organization_id_idx" ON "project_member" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "project_member_project_id_idx" ON "project_member" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_member_member_id_idx" ON "project_member" USING btree ("member_id");--> statement-breakpoint
CREATE UNIQUE INDEX "project_plant_project_id_primary_uidx" ON "project_plant" USING btree ("project_id") WHERE "project_plant"."is_primary";--> statement-breakpoint
CREATE INDEX "project_plant_organization_id_idx" ON "project_plant" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "project_plant_project_id_idx" ON "project_plant" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_plant_plant_id_idx" ON "project_plant" USING btree ("plant_id");