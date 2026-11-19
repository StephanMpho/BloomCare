// BloomCare database schema (PostgreSQL, Drizzle ORM).
// Every health record belongs to a pregnancy, which is owned by exactly one user.
// Partners only reach records through an active (accepted, non-revoked) partner_access row.
import { sql } from "drizzle-orm";
import {
  pgTable, pgEnum, text, integer, boolean, timestamp, date, real, index, uniqueIndex, jsonb,
} from "drizzle-orm/pg-core";
import type { JudgedItem, VerdictLevel } from "../lib/photo-verdict";

const id = () => text("id").primaryKey().$defaultFn(() => crypto.randomUUID());
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const datingMethod = pgEnum("dating_method", ["LMP", "ULTRASOUND", "CLINICIAN"]);
export const mealType = pgEnum("meal_type", [
  "BREAKFAST", "MORNING_SNACK", "LUNCH", "AFTERNOON_SNACK", "SUPPER", "EVENING_SNACK", "DRINKS",
]);
export const amountEaten = pgEnum("amount_eaten", ["FULL", "PARTIAL", "FEW_BITES"]);
export const tolerance = pgEnum("tolerance", ["GOOD", "OKAY", "POOR"]);
export const retention = pgEnum("retention", ["KEPT_DOWN", "PARTLY", "NOT_KEPT_DOWN"]);
export const painLevel = pgEnum("pain_level", ["NONE", "MILD", "SEVERE"]);
export const bleedingLevel = pgEnum("bleeding_level", ["NONE", "SPOTTING", "HEAVY"]);
export const planStatus = pgEnum("plan_status", [
  "PLANNED", "EATEN", "PARTIAL", "NOT_EATEN", "REPLACED", "NOT_TOLERATED",
]);
export const supplementSource = pgEnum("supplement_source", ["CLINICIAN", "PHARMACIST", "NOT_YET_APPROVED"]);
export const doseStatus = pgEnum("dose_status", ["TAKEN", "MISSED"]);
export const cadence = pgEnum("cadence", ["WEEKLY", "MONTHLY"]);

export const users = pgTable("users", {
  id: id(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: createdAt(),
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(), // sha256(cookie token); the raw token is never stored
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: createdAt(),
}, (t) => [index("sessions_user_idx").on(t.userId)]);

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: id(),
  tokenHash: text("token_hash").notNull().unique(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
});

export const pregnancies = pgTable("pregnancies", {
  id: id(),
  ownerId: text("owner_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  preferredName: text("preferred_name").notNull(),
  greeting: text("greeting").notNull().default(""),
  lmpDate: date("lmp_date").notNull(),
  clinicalDueDate: date("clinical_due_date"),
  datingMethod: datingMethod("dating_method").notNull().default("LMP"),
  ultrasoundConfirmed: boolean("ultrasound_confirmed").notNull().default(false),
  allergies: text("allergies").notNull().default(""),
  dietaryPreferences: text("dietary_preferences").notNull().default(""),
  nauseaTriggers: text("nausea_triggers").notNull().default(""),
  toleratedAtStart: text("tolerated_at_start").notNull().default(""),
  monthlyBudgetCents: integer("monthly_budget_cents").notNull().default(300000),
  quietHoursStart: text("quiet_hours_start").notNull().default("21:00"),
  quietHoursEnd: text("quiet_hours_end").notNull().default("07:00"),
  onboardedAt: timestamp("onboarded_at", { withTimezone: true }),
  createdAt: createdAt(),
});

export const partnerAccess = pgTable("partner_access", {
  id: id(),
  pregnancyId: text("pregnancy_id").notNull().references(() => pregnancies.id, { onDelete: "cascade" }),
  partnerUserId: text("partner_user_id").references(() => users.id, { onDelete: "cascade" }),
  inviteTokenHash: text("invite_token_hash").notNull().unique(),
  permissions: text("permissions").array().notNull().default(sql`'{}'::text[]`),
  consentAt: timestamp("consent_at", { withTimezone: true }).notNull().defaultNow(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  createdAt: createdAt(),
}, (t) => [index("partner_user_idx").on(t.partnerUserId), index("partner_preg_idx").on(t.pregnancyId)]);

export const foods = pgTable("foods", {
  id: id(),
  key: text("key").unique(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  servingLabel: text("serving_label").notNull(),
  servingGrams: real("serving_grams").notNull(),
  // Per 100 g. NULL = no reliable value; never filled with guesses.
  proteinG: real("protein_g"),
  carbsG: real("carbs_g"),
  fatG: real("fat_g"),
  fibreG: real("fibre_g"),
  ironMg: real("iron_mg"),
  calciumMg: real("calcium_mg"),
  folateUg: real("folate_ug"),
  b12Ug: real("b12_ug"),
  cholineMg: real("choline_mg"),
  nutrientSource: text("nutrient_source").notNull().default("No nutrient data"),
  safetyNote: text("safety_note"),
  createdById: text("created_by_id").references(() => users.id, { onDelete: "cascade" }),
  createdAt: createdAt(),
}, (t) => [index("foods_name_idx").on(t.name)]);

export const foodLogs = pgTable("food_logs", {
  id: id(),
  pregnancyId: text("pregnancy_id").notNull().references(() => pregnancies.id, { onDelete: "cascade" }),
  loggedById: text("logged_by_id").notNull(),
  foodId: text("food_id").references(() => foods.id, { onDelete: "set null" }),
  foodName: text("food_name").notNull(),
  mealType: mealType("meal_type").notNull(),
  eatenAt: timestamp("eaten_at", { withTimezone: true }).notNull(),
  portionLabel: text("portion_label").notNull(),
  grams: real("grams"),
  preparation: text("preparation").notNull().default(""),
  amountEaten: amountEaten("amount_eaten").notNull().default("FULL"),
  tolerance: tolerance("tolerance").notNull(),
  nauseaAfter: boolean("nausea_after").notNull().default(false),
  vomitedAfter: boolean("vomited_after").notNull().default(false),
  favourite: boolean("favourite").notNull().default(false),
  notes: text("notes").notNull().default(""),
  createdAt: createdAt(),
}, (t) => [index("food_logs_preg_time_idx").on(t.pregnancyId, t.eatenAt)]);

export const drinkLogs = pgTable("drink_logs", {
  id: id(),
  pregnancyId: text("pregnancy_id").notNull().references(() => pregnancies.id, { onDelete: "cascade" }),
  loggedById: text("logged_by_id").notNull(),
  drinkType: text("drink_type").notNull(),
  offeredMl: integer("offered_ml"),
  consumedMl: integer("consumed_ml").notNull(),
  retention: retention("retention").notNull(),
  temperature: text("temperature").notNull().default(""),
  drankAt: timestamp("drank_at", { withTimezone: true }).notNull(),
  notes: text("notes").notNull().default(""),
  createdAt: createdAt(),
}, (t) => [index("drink_logs_preg_time_idx").on(t.pregnancyId, t.drankAt)]);

export const symptomLogs = pgTable("symptom_logs", {
  id: id(),
  pregnancyId: text("pregnancy_id").notNull().references(() => pregnancies.id, { onDelete: "cascade" }),
  loggedById: text("logged_by_id").notNull(),
  loggedAt: timestamp("logged_at", { withTimezone: true }).notNull(),
  nauseaSeverity: integer("nausea_severity"),
  nauseaStartedAt: text("nausea_started_at").notNull().default(""),
  vomitCount: integer("vomit_count").notNull().default(0),
  fluidsKeptDown: retention("fluids_kept_down"),
  appetite: integer("appetite"),
  weightKg: real("weight_kg"),
  weightLossNoticed: boolean("weight_loss_noticed").notNull().default(false),
  dizziness: boolean("dizziness").notNull().default(false),
  weakness: boolean("weakness").notNull().default(false),
  fainting: boolean("fainting").notNull().default(false),
  reducedUrine: boolean("reduced_urine").notNull().default(false),
  abdominalPain: painLevel("abdominal_pain").notNull().default("NONE"),
  shoulderTipPain: boolean("shoulder_tip_pain").notNull().default(false),
  bleeding: bleedingLevel("bleeding").notNull().default("NONE"),
  fever: boolean("fever").notNull().default(false),
  triggers: text("triggers").notNull().default(""),
  notes: text("notes").notNull().default(""),
  createdAt: createdAt(),
}, (t) => [index("symptom_logs_preg_time_idx").on(t.pregnancyId, t.loggedAt)]);

export const checkIns = pgTable("wellness_check_ins", {
  id: id(),
  pregnancyId: text("pregnancy_id").notNull().references(() => pregnancies.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  mood: integer("mood"),
  nauseaSeverity: integer("nausea_severity"),
  vomitCount: integer("vomit_count"),
  fluidsKeptDown: retention("fluids_kept_down"),
  appetite: integer("appetite"),
  energy: integer("energy"),
  dizzyOrWeak: boolean("dizzy_or_weak"),
  painOrBleeding: boolean("pain_or_bleeding"),
  partnerRequest: text("partner_request").notNull().default(""),
  notes: text("notes").notNull().default(""),
  createdAt: createdAt(),
}, (t) => [index("checkins_preg_date_idx").on(t.pregnancyId, t.date)]);

export const mealPlanEntries = pgTable("meal_plan_entries", {
  id: id(),
  pregnancyId: text("pregnancy_id").notNull().references(() => pregnancies.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  mealType: mealType("meal_type").notNull(),
  templateKey: text("template_key"),
  title: text("title").notNull(),
  portion: text("portion").notNull().default(""),
  preparation: text("preparation").notNull().default(""),
  nutrients: text("nutrients").notNull().default(""),
  alternative: text("alternative").notNull().default(""),
  safetyNote: text("safety_note").notNull().default(""),
  estCostCents: integer("est_cost_cents").notNull().default(0),
  status: planStatus("status").notNull().default("PLANNED"),
  createdAt: createdAt(),
}, (t) => [index("meal_plan_preg_date_idx").on(t.pregnancyId, t.date)]);

export const savedMeals = pgTable("saved_meals", {
  id: id(),
  pregnancyId: text("pregnancy_id").notNull().references(() => pregnancies.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  mealType: mealType("meal_type").notNull(),
  portion: text("portion").notNull().default(""),
  preparation: text("preparation").notNull().default(""),
  createdAt: createdAt(),
});

export const groceryItems = pgTable("grocery_items", {
  id: id(),
  pregnancyId: text("pregnancy_id").notNull().references(() => pregnancies.id, { onDelete: "cascade" }),
  month: text("month").notNull(), // YYYY-MM
  name: text("name").notNull(),
  category: text("category").notNull(),
  quantity: real("quantity").notNull().default(1),
  unit: text("unit").notNull().default("item"),
  estCostCents: integer("est_cost_cents").notNull().default(0),
  actualCostCents: integer("actual_cost_cents"),
  store: text("store").notNull().default(""),
  cadence: cadence("cadence").notNull().default("WEEKLY"),
  purchased: boolean("purchased").notNull().default(false),
  purchaseDate: date("purchase_date"),
  expiryDate: date("expiry_date"),
  inPantry: boolean("in_pantry").notNull().default(false),
  fromMealPlan: boolean("from_meal_plan").notNull().default(false),
  shopDate: date("shop_date"), // which weekly shopping trip this belongs to (monthly plans); null = no specific trip
  notes: text("notes").notNull().default(""),
  createdAt: createdAt(),
}, (t) => [index("grocery_preg_month_idx").on(t.pregnancyId, t.month)]);

export const supplements = pgTable("supplements", {
  id: id(),
  pregnancyId: text("pregnancy_id").notNull().references(() => pregnancies.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  dose: text("dose").notNull(),
  unit: text("unit").notNull(),
  frequency: text("frequency").notNull(),
  instructions: text("instructions").notNull().default(""),
  ingredients: text("ingredients").array().notNull().default(sql`'{}'::text[]`),
  recommendedBy: text("recommended_by").notNull().default(""),
  source: supplementSource("source").notNull(),
  startDate: date("start_date"),
  active: boolean("active").notNull().default(true),
  reminderEnabled: boolean("reminder_enabled").notNull().default(false),
  notes: text("notes").notNull().default(""),
  createdAt: createdAt(),
});

export const supplementLogs = pgTable("supplement_logs", {
  id: id(),
  supplementId: text("supplement_id").notNull().references(() => supplements.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  status: doseStatus("status").notNull(),
  sideEffects: text("side_effects").notNull().default(""),
  createdAt: createdAt(),
}, (t) => [uniqueIndex("supplement_log_day_uq").on(t.supplementId, t.date)]);

export const appointments = pgTable("appointments", {
  id: id(),
  pregnancyId: text("pregnancy_id").notNull().references(() => pregnancies.id, { onDelete: "cascade" }),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  provider: text("provider").notNull(),
  location: text("location").notNull().default(""),
  type: text("type").notNull().default(""),
  estCostCents: integer("est_cost_cents"),
  actualCostCents: integer("actual_cost_cents"),
  questions: text("questions").notNull().default(""),
  notes: text("notes").notNull().default(""),
  followUp: text("follow_up").notNull().default(""),
  createdAt: createdAt(),
}, (t) => [index("appt_preg_time_idx").on(t.pregnancyId, t.startsAt)]);

export const journalEntries = pgTable("journal_entries", {
  id: id(),
  pregnancyId: text("pregnancy_id").notNull().references(() => pregnancies.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  week: integer("week").notNull(),
  feeling: text("feeling").notNull().default(""),
  favouriteFoods: text("favourite_foods").notNull().default(""),
  aversions: text("aversions").notNull().default(""),
  questions: text("questions").notNull().default(""),
  memories: text("memories").notNull().default(""),
  private: boolean("private").notNull().default(false),
  createdAt: createdAt(),
});

export const supportRequests = pgTable("support_requests", {
  id: id(),
  pregnancyId: text("pregnancy_id").notNull().references(() => pregnancies.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  doneAt: timestamp("done_at", { withTimezone: true }),
  createdAt: createdAt(),
});

export const reminders = pgTable("reminders", {
  id: id(),
  pregnancyId: text("pregnancy_id").notNull().references(() => pregnancies.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(), // FLUIDS | MEALS | SUPPLEMENTS | CHECKIN | GROCERIES
  enabled: boolean("enabled").notNull().default(false),
  times: text("times").array().notNull().default(sql`'{}'::text[]`),
}, (t) => [uniqueIndex("reminder_kind_uq").on(t.pregnancyId, t.kind)]);

export const safetyAcknowledgements = pgTable("medical_safety_acknowledgements", {
  id: id(),
  pregnancyId: text("pregnancy_id").notNull().references(() => pregnancies.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  alertType: text("alert_type").notNull(),
  displayedAt: timestamp("displayed_at", { withTimezone: true }).notNull().defaultNow(),
  acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }),
}, (t) => [index("ack_preg_type_idx").on(t.pregnancyId, t.alertType)]);

// Result of a food-photo check. The photo itself is never stored: only the confirmed
// food names and the rule-based verdict. Visible to an accepted partner regardless of
// share settings (she is told this on the camera screen before each check).
export const photoChecks = pgTable("photo_checks", {
  id: id(),
  pregnancyId: text("pregnancy_id").notNull().references(() => pregnancies.id, { onDelete: "cascade" }),
  checkedById: text("checked_by_id").notNull(), // no FK (like food_logs.logged_by_id): her records survive a partner deleting their account
  overall: text("overall").$type<VerdictLevel>().notNull(),
  items: jsonb("items").$type<JudgedItem[]>().notNull(),
  createdAt: createdAt(),
}, (t) => [index("photo_checks_preg_time_idx").on(t.pregnancyId, t.createdAt)]);

export const auditLogs = pgTable("audit_logs", {
  id: id(),
  actorId: text("actor_id").references(() => users.id, { onDelete: "set null" }),
  pregnancyId: text("pregnancy_id").references(() => pregnancies.id, { onDelete: "cascade" }),
  action: text("action").notNull(),
  detail: text("detail").notNull().default(""),
  createdAt: createdAt(),
}, (t) => [index("audit_preg_time_idx").on(t.pregnancyId, t.createdAt)]);
