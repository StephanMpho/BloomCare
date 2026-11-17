CREATE TABLE "photo_checks" (
	"id" text PRIMARY KEY NOT NULL,
	"pregnancy_id" text NOT NULL,
	"checked_by_id" text NOT NULL,
	"overall" text NOT NULL,
	"items" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "photo_checks" ADD CONSTRAINT "photo_checks_pregnancy_id_pregnancies_id_fk" FOREIGN KEY ("pregnancy_id") REFERENCES "public"."pregnancies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "photo_checks_preg_time_idx" ON "photo_checks" USING btree ("pregnancy_id","created_at");