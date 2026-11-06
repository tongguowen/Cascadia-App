-- Watchlink S1 search: enable pg_trgm for fuzzy item number/name match.
-- Safe to re-run: IF NOT EXISTS guards.
CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_items_item_number_trgm" ON "items" USING gin ("item_number" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_items_name_trgm" ON "items" USING gin ("name" gin_trgm_ops);
