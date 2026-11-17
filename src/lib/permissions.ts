// Partner permission model. The pregnant user (owner) decides exactly which
// categories a partner can see or help with. Nothing is shared by default.

export const PERMISSIONS = {
  VIEW_MEALS: { label: "Today's meals & food diary", group: "View" },
  VIEW_TOLERANCE: { label: "Foods I can / can't tolerate", group: "View" },
  VIEW_SYMPTOMS: { label: "Nausea & symptom logs (incl. safety alerts)", group: "View" },
  VIEW_HYDRATION: { label: "Hydration logs", group: "View" },
  VIEW_SUPPLEMENTS: { label: "Supplements", group: "View" },
  VIEW_JOURNEY: { label: "Pregnancy progress & non-private journal entries", group: "View" },
  VIEW_NOTES: { label: "My personal notes on logs", group: "View" },
  APPOINTMENTS: { label: "See & add appointments", group: "Help with" },
  MEAL_PLAN: { label: "See & edit the meal plan", group: "Help with" },
  GROCERIES: { label: "See & manage groceries and budget", group: "Help with" },
  LOG_FOR_ME: { label: "Log food & drinks on my behalf", group: "Help with" },
  SUPPORT_REQUESTS: { label: "See my 'how you can help' requests", group: "Help with" },
} as const;

export type Permission = keyof typeof PERMISSIONS;
export const ALL_PERMISSIONS = Object.keys(PERMISSIONS) as Permission[];

/** A sensible default set the owner can adjust — excludes symptoms and personal notes. */
export const SUGGESTED_PERMISSIONS: Permission[] = [
  "VIEW_MEALS", "VIEW_TOLERANCE", "VIEW_JOURNEY", "APPOINTMENTS", "MEAL_PLAN", "GROCERIES", "SUPPORT_REQUESTS",
];

export type Role = "OWNER" | "PARTNER";

export type Access = { role: Role; permissions: Permission[] };

export function can(access: Access, p: Permission): boolean {
  return access.role === "OWNER" || access.permissions.includes(p);
}

export function sanitizePermissions(input: string[]): Permission[] {
  return Array.from(new Set(input.filter((p): p is Permission => p in PERMISSIONS)));
}

/** Area → permission needed to view it. Undefined = owner only. */
export const AREA_PERMISSION: Record<string, Permission | undefined> = {
  food: "VIEW_MEALS",
  symptoms: "VIEW_SYMPTOMS",
  hydration: "VIEW_HYDRATION",
  planner: "MEAL_PLAN",
  groceries: "GROCERIES",
  supplements: "VIEW_SUPPLEMENTS",
  journey: "VIEW_JOURNEY",
  appointments: "APPOINTMENTS",
};
