CREATE TYPE "public"."item_structure_type" AS ENUM('ASSEMBLY', 'GROUP', 'PART');--> statement-breakpoint
ALTER TABLE "bom_line" DROP CONSTRAINT "bom_line_child_bom_revision_org_fk";
--> statement-breakpoint
DROP INDEX "bom_revision_bom_id_revision_uidx";--> statement-breakpoint
ALTER TABLE "bom_revision" ADD COLUMN "revision_number" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "bom_revision" ADD COLUMN "lock_version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "bom_revision" ADD COLUMN "root_item_snapshot" jsonb;--> statement-breakpoint
ALTER TABLE "item" ADD COLUMN "is_sellable" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "item" ADD COLUMN "structure_type" "item_structure_type" DEFAULT 'PART' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "bom_active_item_uidx" ON "bom" USING btree ("organization_id","item_id") WHERE "bom"."status" = 'ACTIVE' AND "bom"."archived_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "bom_revision_bom_id_revision_number_uidx" ON "bom_revision" USING btree ("bom_id","revision_number");--> statement-breakpoint
CREATE UNIQUE INDEX "bom_revision_bom_id_released_uidx" ON "bom_revision" USING btree ("bom_id") WHERE "bom_revision"."status" = 'RELEASED';--> statement-breakpoint
CREATE UNIQUE INDEX "bom_revision_bom_id_open_uidx" ON "bom_revision" USING btree ("bom_id") WHERE "bom_revision"."status" IN ('DRAFT', 'IN_REVIEW');--> statement-breakpoint
ALTER TABLE "bom_line" DROP COLUMN "child_bom_revision_id";