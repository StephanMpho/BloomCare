CREATE TYPE "public"."amount_eaten" AS ENUM('FULL', 'PARTIAL', 'FEW_BITES');--> statement-breakpoint
CREATE TYPE "public"."bleeding_level" AS ENUM('NONE', 'SPOTTING', 'HEAVY');--> statement-breakpoint
CREATE TYPE "public"."cadence" AS ENUM('WEEKLY', 'MONTHLY');--> statement-breakpoint
CREATE TYPE "public"."dating_method" AS ENUM('LMP', 'ULTRASOUND', 'CLINICIAN');--> statement-breakpoint
CREATE TYPE "public"."dose_status" AS ENUM('TAKEN', 'MISSED');--> statement-breakpoint
CREATE TYPE "public"."meal_type" AS ENUM('BREAKFAST', 'MORNING_SNACK', 'LUNCH', 'AFTERNOON_SNACK', 'SUPPER', 'EVENING_SNACK', 'DRINKS');--> statement-breakpoint
CREATE TYPE "public"."pain_level" AS ENUM('NONE', 'MILD', 'SEVERE');--> statement-breakpoint
CREATE TYPE "public"."plan_status" AS ENUM('PLANNED', 'EATEN', 'PARTIAL', 'NOT_EATEN', 'REPLACED', 'NOT_TOLERATED');--> statement-breakpoint
CREATE TYPE "public"."retention" AS ENUM('KEPT_DOWN', 'PARTLY', 'NOT_KEPT_DOWN');--> statement-breakpoint
CREATE TYPE "public"."supplement_source" AS ENUM('CLINICIAN', 'PHARMACIST', 'NOT_YET_APPROVED');--> statement-breakpoint
CREATE TYPE "public"."tolerance" AS ENUM('GOOD', 'OKAY', 'POOR');--> statement-breakpoint
CREATE TABLE "appointments" (
	"id" text PRIMARY KEY NOT NULL,
	"pregnancy_id" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"provider" text NOT NULL,
	"location" text DEFAULT '' NOT NULL,
	"type" text DEFAULT '' NOT NULL,
	"est_cost_cents" integer,
	"actual_cost_cents" integer,
	"questions" text DEFAULT '' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"follow_up" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"actor_id" text,
	"pregnancy_id" text,
	"action" text NOT NULL,
	"detail" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wellness_check_ins" (
	"id" text PRIMARY KEY NOT NULL,
	"pregnancy_id" text NOT NULL,
	"date" date NOT NULL,
	"mood" integer,
	"nausea_severity" integer,
	"vomit_count" integer,
	"fluids_kept_down" "retention",
	"appetite" integer,
	"energy" integer,
	"dizzy_or_weak" boolean,
	"pain_or_bleeding" boolean,
	"partner_request" text DEFAULT '' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "drink_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"pregnancy_id" text NOT NULL,
	"logged_by_id" text NOT NULL,
	"drink_type" text NOT NULL,
	"offered_ml" integer,
	"consumed_ml" integer NOT NULL,
	"retention" "retention" NOT NULL,
	"temperature" text DEFAULT '' NOT NULL,
	"drank_at" timestamp with time zone NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "food_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"pregnancy_id" text NOT NULL,
	"logged_by_id" text NOT NULL,
	"food_id" text,
	"food_name" text NOT NULL,
	"meal_type" "meal_type" NOT NULL,
	"eaten_at" timestamp with time zone NOT NULL,
	"portion_label" text NOT NULL,
	"grams" real,
	"preparation" text DEFAULT '' NOT NULL,
	"amount_eaten" "amount_eaten" DEFAULT 'FULL' NOT NULL,
	"tolerance" "tolerance" NOT NULL,
	"nausea_after" boolean DEFAULT false NOT NULL,
	"vomited_after" boolean DEFAULT false NOT NULL,
	"favourite" boolean DEFAULT false NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "foods" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"serving_label" text NOT NULL,
	"serving_grams" real NOT NULL,
	"protein_g" real,
	"carbs_g" real,
	"fat_g" real,
	"fibre_g" real,
	"iron_mg" real,
	"calcium_mg" real,
	"folate_ug" real,
	"b12_ug" real,
	"choline_mg" real,
	"nutrient_source" text DEFAULT 'No nutrient data' NOT NULL,
	"safety_note" text,
	"created_by_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "foods_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "grocery_items" (
	"id" text PRIMARY KEY NOT NULL,
	"pregnancy_id" text NOT NULL,
	"month" text NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"quantity" real DEFAULT 1 NOT NULL,
	"unit" text DEFAULT 'item' NOT NULL,
	"est_cost_cents" integer DEFAULT 0 NOT NULL,
	"actual_cost_cents" integer,
	"store" text DEFAULT '' NOT NULL,
	"cadence" "cadence" DEFAULT 'WEEKLY' NOT NULL,
	"purchased" boolean DEFAULT false NOT NULL,
	"purchase_date" date,
	"expiry_date" date,
	"in_pantry" boolean DEFAULT false NOT NULL,
	"from_meal_plan" boolean DEFAULT false NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "journal_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"pregnancy_id" text NOT NULL,
	"date" date NOT NULL,
	"week" integer NOT NULL,
	"feeling" text DEFAULT '' NOT NULL,
	"favourite_foods" text DEFAULT '' NOT NULL,
	"aversions" text DEFAULT '' NOT NULL,
	"questions" text DEFAULT '' NOT NULL,
	"memories" text DEFAULT '' NOT NULL,
	"private" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meal_plan_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"pregnancy_id" text NOT NULL,
	"date" date NOT NULL,
	"meal_type" "meal_type" NOT NULL,
	"template_key" text,
	"title" text NOT NULL,
	"portion" text DEFAULT '' NOT NULL,
	"preparation" text DEFAULT '' NOT NULL,
	"nutrients" text DEFAULT '' NOT NULL,
	"alternative" text DEFAULT '' NOT NULL,
	"safety_note" text DEFAULT '' NOT NULL,
	"est_cost_cents" integer DEFAULT 0 NOT NULL,
	"status" "plan_status" DEFAULT 'PLANNED' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "partner_access" (
	"id" text PRIMARY KEY NOT NULL,
	"pregnancy_id" text NOT NULL,
	"partner_user_id" text,
	"invite_token_hash" text NOT NULL,
	"permissions" text[] DEFAULT '{}'::text[] NOT NULL,
	"consent_at" timestamp with time zone DEFAULT now() NOT NULL,
	"accepted_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "partner_access_invite_token_hash_unique" UNIQUE("invite_token_hash")
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"token_hash" text NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	CONSTRAINT "password_reset_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "pregnancies" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"preferred_name" text NOT NULL,
	"greeting" text DEFAULT '' NOT NULL,
	"lmp_date" date NOT NULL,
	"clinical_due_date" date,
	"dating_method" "dating_method" DEFAULT 'LMP' NOT NULL,
	"ultrasound_confirmed" boolean DEFAULT false NOT NULL,
	"allergies" text DEFAULT '' NOT NULL,
	"dietary_preferences" text DEFAULT '' NOT NULL,
	"nausea_triggers" text DEFAULT '' NOT NULL,
	"tolerated_at_start" text DEFAULT '' NOT NULL,
	"monthly_budget_cents" integer DEFAULT 300000 NOT NULL,
	"quiet_hours_start" text DEFAULT '21:00' NOT NULL,
	"quiet_hours_end" text DEFAULT '07:00' NOT NULL,
	"onboarded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pregnancies_owner_id_unique" UNIQUE("owner_id")
);
--> statement-breakpoint
CREATE TABLE "reminders" (
	"id" text PRIMARY KEY NOT NULL,
	"pregnancy_id" text NOT NULL,
	"kind" text NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"times" text[] DEFAULT '{}'::text[] NOT NULL
);
--> statement-breakpoint
CREATE TABLE "medical_safety_acknowledgements" (
	"id" text PRIMARY KEY NOT NULL,
	"pregnancy_id" text NOT NULL,
	"user_id" text NOT NULL,
	"alert_type" text NOT NULL,
	"displayed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"acknowledged_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "saved_meals" (
	"id" text PRIMARY KEY NOT NULL,
	"pregnancy_id" text NOT NULL,
	"title" text NOT NULL,
	"meal_type" "meal_type" NOT NULL,
	"portion" text DEFAULT '' NOT NULL,
	"preparation" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supplement_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"supplement_id" text NOT NULL,
	"date" date NOT NULL,
	"status" "dose_status" NOT NULL,
	"side_effects" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supplements" (
	"id" text PRIMARY KEY NOT NULL,
	"pregnancy_id" text NOT NULL,
	"name" text NOT NULL,
	"dose" text NOT NULL,
	"unit" text NOT NULL,
	"frequency" text NOT NULL,
	"instructions" text DEFAULT '' NOT NULL,
	"ingredients" text[] DEFAULT '{}'::text[] NOT NULL,
	"recommended_by" text DEFAULT '' NOT NULL,
	"source" "supplement_source" NOT NULL,
	"start_date" date,
	"active" boolean DEFAULT true NOT NULL,
	"reminder_enabled" boolean DEFAULT false NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "support_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"pregnancy_id" text NOT NULL,
	"text" text NOT NULL,
	"done_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "symptom_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"pregnancy_id" text NOT NULL,
	"logged_by_id" text NOT NULL,
	"logged_at" timestamp with time zone NOT NULL,
	"nausea_severity" integer,
	"nausea_started_at" text DEFAULT '' NOT NULL,
	"vomit_count" integer DEFAULT 0 NOT NULL,
	"fluids_kept_down" "retention",
	"appetite" integer,
	"weight_kg" real,
	"weight_loss_noticed" boolean DEFAULT false NOT NULL,
	"dizziness" boolean DEFAULT false NOT NULL,
	"weakness" boolean DEFAULT false NOT NULL,
	"fainting" boolean DEFAULT false NOT NULL,
	"reduced_urine" boolean DEFAULT false NOT NULL,
	"abdominal_pain" "pain_level" DEFAULT 'NONE' NOT NULL,
	"shoulder_tip_pain" boolean DEFAULT false NOT NULL,
	"bleeding" "bleeding_level" DEFAULT 'NONE' NOT NULL,
	"fever" boolean DEFAULT false NOT NULL,
	"triggers" text DEFAULT '' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_pregnancy_id_pregnancies_id_fk" FOREIGN KEY ("pregnancy_id") REFERENCES "public"."pregnancies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_pregnancy_id_pregnancies_id_fk" FOREIGN KEY ("pregnancy_id") REFERENCES "public"."pregnancies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wellness_check_ins" ADD CONSTRAINT "wellness_check_ins_pregnancy_id_pregnancies_id_fk" FOREIGN KEY ("pregnancy_id") REFERENCES "public"."pregnancies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drink_logs" ADD CONSTRAINT "drink_logs_pregnancy_id_pregnancies_id_fk" FOREIGN KEY ("pregnancy_id") REFERENCES "public"."pregnancies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "food_logs" ADD CONSTRAINT "food_logs_pregnancy_id_pregnancies_id_fk" FOREIGN KEY ("pregnancy_id") REFERENCES "public"."pregnancies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "food_logs" ADD CONSTRAINT "food_logs_food_id_foods_id_fk" FOREIGN KEY ("food_id") REFERENCES "public"."foods"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "foods" ADD CONSTRAINT "foods_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grocery_items" ADD CONSTRAINT "grocery_items_pregnancy_id_pregnancies_id_fk" FOREIGN KEY ("pregnancy_id") REFERENCES "public"."pregnancies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_pregnancy_id_pregnancies_id_fk" FOREIGN KEY ("pregnancy_id") REFERENCES "public"."pregnancies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_plan_entries" ADD CONSTRAINT "meal_plan_entries_pregnancy_id_pregnancies_id_fk" FOREIGN KEY ("pregnancy_id") REFERENCES "public"."pregnancies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_access" ADD CONSTRAINT "partner_access_pregnancy_id_pregnancies_id_fk" FOREIGN KEY ("pregnancy_id") REFERENCES "public"."pregnancies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_access" ADD CONSTRAINT "partner_access_partner_user_id_users_id_fk" FOREIGN KEY ("partner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pregnancies" ADD CONSTRAINT "pregnancies_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_pregnancy_id_pregnancies_id_fk" FOREIGN KEY ("pregnancy_id") REFERENCES "public"."pregnancies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medical_safety_acknowledgements" ADD CONSTRAINT "medical_safety_acknowledgements_pregnancy_id_pregnancies_id_fk" FOREIGN KEY ("pregnancy_id") REFERENCES "public"."pregnancies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medical_safety_acknowledgements" ADD CONSTRAINT "medical_safety_acknowledgements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_meals" ADD CONSTRAINT "saved_meals_pregnancy_id_pregnancies_id_fk" FOREIGN KEY ("pregnancy_id") REFERENCES "public"."pregnancies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplement_logs" ADD CONSTRAINT "supplement_logs_supplement_id_supplements_id_fk" FOREIGN KEY ("supplement_id") REFERENCES "public"."supplements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplements" ADD CONSTRAINT "supplements_pregnancy_id_pregnancies_id_fk" FOREIGN KEY ("pregnancy_id") REFERENCES "public"."pregnancies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_requests" ADD CONSTRAINT "support_requests_pregnancy_id_pregnancies_id_fk" FOREIGN KEY ("pregnancy_id") REFERENCES "public"."pregnancies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "symptom_logs" ADD CONSTRAINT "symptom_logs_pregnancy_id_pregnancies_id_fk" FOREIGN KEY ("pregnancy_id") REFERENCES "public"."pregnancies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "appt_preg_time_idx" ON "appointments" USING btree ("pregnancy_id","starts_at");--> statement-breakpoint
CREATE INDEX "audit_preg_time_idx" ON "audit_logs" USING btree ("pregnancy_id","created_at");--> statement-breakpoint
CREATE INDEX "checkins_preg_date_idx" ON "wellness_check_ins" USING btree ("pregnancy_id","date");--> statement-breakpoint
CREATE INDEX "drink_logs_preg_time_idx" ON "drink_logs" USING btree ("pregnancy_id","drank_at");--> statement-breakpoint
CREATE INDEX "food_logs_preg_time_idx" ON "food_logs" USING btree ("pregnancy_id","eaten_at");--> statement-breakpoint
CREATE INDEX "foods_name_idx" ON "foods" USING btree ("name");--> statement-breakpoint
CREATE INDEX "grocery_preg_month_idx" ON "grocery_items" USING btree ("pregnancy_id","month");--> statement-breakpoint
CREATE INDEX "meal_plan_preg_date_idx" ON "meal_plan_entries" USING btree ("pregnancy_id","date");--> statement-breakpoint
CREATE INDEX "partner_user_idx" ON "partner_access" USING btree ("partner_user_id");--> statement-breakpoint
CREATE INDEX "partner_preg_idx" ON "partner_access" USING btree ("pregnancy_id");--> statement-breakpoint
CREATE UNIQUE INDEX "reminder_kind_uq" ON "reminders" USING btree ("pregnancy_id","kind");--> statement-breakpoint
CREATE INDEX "ack_preg_type_idx" ON "medical_safety_acknowledgements" USING btree ("pregnancy_id","alert_type");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "supplement_log_day_uq" ON "supplement_logs" USING btree ("supplement_id","date");--> statement-breakpoint
CREATE INDEX "symptom_logs_preg_time_idx" ON "symptom_logs" USING btree ("pregnancy_id","logged_at");