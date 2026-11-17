-- Supabase (and similar hosts) expose the public schema through an auto-generated REST API.
-- Row-level security with no policies blocks that API completely. The app connects as the
-- table owner, which bypasses RLS, so app behaviour is unchanged.
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "sessions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "pregnancies" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "partner_access" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "foods" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "food_logs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "drink_logs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "symptom_logs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "wellness_check_ins" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "meal_plan_entries" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "saved_meals" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "grocery_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "supplements" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "supplement_logs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "appointments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "journal_entries" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "support_requests" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "reminders" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "medical_safety_acknowledgements" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "photo_checks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;
