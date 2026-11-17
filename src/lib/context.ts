import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { and, eq, isNull, isNotNull } from "drizzle-orm";
import { db, schema } from "@/db";
import { currentUser } from "./auth";
import { can, sanitizePermissions, type Access, type Permission } from "./permissions";
import { calculateDating } from "./pregnancy";

export type AppContext = {
  user: typeof schema.users.$inferSelect;
  pregnancy: typeof schema.pregnancies.$inferSelect;
  access: Access;
  isOwner: boolean;
  dating: ReturnType<typeof calculateDating>;
};

/**
 * Resolve who is signed in and which pregnancy they can see.
 * Owners see their own pregnancy. Partners see one only via an accepted,
 * non-revoked partner_access row — re-checked on every request, so revocation is immediate.
 */
export const getContext = cache(async (): Promise<AppContext | null> => {
  const user = await currentUser();
  if (!user) return null;

  const own = await db.query.pregnancies.findFirst({ where: eq(schema.pregnancies.ownerId, user.id) });
  if (own) {
    return { user, pregnancy: own, access: { role: "OWNER", permissions: [] }, isOwner: true, dating: datingOf(own) };
  }
  const grant = await db.query.partnerAccess.findFirst({
    where: and(eq(schema.partnerAccess.partnerUserId, user.id), isNull(schema.partnerAccess.revokedAt), isNotNull(schema.partnerAccess.acceptedAt)),
  });
  if (!grant) return null;
  const preg = await db.query.pregnancies.findFirst({ where: eq(schema.pregnancies.id, grant.pregnancyId) });
  if (!preg) return null;
  return {
    user, pregnancy: preg, isOwner: false,
    access: { role: "PARTNER", permissions: sanitizePermissions(grant.permissions) },
    dating: datingOf(preg),
  };
});

function datingOf(p: typeof schema.pregnancies.$inferSelect) {
  return calculateDating({ lmpDate: p.lmpDate, clinicalDueDate: p.clinicalDueDate, datingMethod: p.datingMethod });
}

/** For pages: require a session; send new users to onboarding. */
export async function requireContext(): Promise<AppContext> {
  const user = await currentUser();
  if (!user) redirect("/login");
  const ctx = await getContext();
  if (!ctx) {
    const formerPartner = await db.query.partnerAccess.findFirst({ where: eq(schema.partnerAccess.partnerUserId, user.id) });
    redirect(formerPartner ? "/invite/invalid?reason=revoked" : "/onboarding");
  }
  if (ctx.isOwner && !ctx.pregnancy.onboardedAt) redirect("/onboarding");
  return ctx;
}

export async function requirePermission(p: Permission, opts: { audit?: string } = {}) {
  const ctx = await requireContext();
  if (!can(ctx.access, p)) redirect("/partner?denied=1");
  if (!ctx.isOwner && opts.audit) await audit(ctx, opts.audit);
  return ctx;
}

export async function requireOwner() {
  const ctx = await requireContext();
  if (!ctx.isOwner) redirect("/partner?denied=1");
  return ctx;
}

export async function audit(ctx: Pick<AppContext, "user" | "pregnancy">, action: string, detail = "") {
  await db.insert(schema.auditLogs).values({ actorId: ctx.user.id, pregnancyId: ctx.pregnancy.id, action, detail });
}

/** For server actions: returns ctx or throws a user-safe error. */
export async function actionContext(p?: Permission) {
  const ctx = await getContext();
  if (!ctx) throw new Error("Please sign in again.");
  if (p && !can(ctx.access, p)) throw new Error("You don't have permission to do that.");
  return ctx;
}
