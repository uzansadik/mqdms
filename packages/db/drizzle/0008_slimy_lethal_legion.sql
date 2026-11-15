ALTER TABLE "bom_line" ADD COLUMN "parent_line_id" uuid;--> statement-breakpoint
ALTER TABLE "bom_line" ADD COLUMN "lineage_id" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "bom_line" ADD COLUMN "item_snapshot" jsonb;--> statement-breakpoint
CREATE UNIQUE INDEX "bom_line_root_sort_uidx" ON "bom_line" USING btree ("organization_id","bom_revision_id","sort_order") WHERE "bom_line"."parent_line_id" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "bom_line_child_sort_uidx" ON "bom_line" USING btree ("organization_id","bom_revision_id","parent_line_id","sort_order") WHERE "bom_line"."parent_line_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "bom_line_parent_line_id_idx" ON "bom_line" USING btree ("parent_line_id");--> statement-breakpoint
ALTER TABLE "bom_line" ADD CONSTRAINT "bom_line_organization_id_bom_revision_id_id_unique" UNIQUE("organization_id","bom_revision_id","id");