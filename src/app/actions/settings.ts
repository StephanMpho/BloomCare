"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, isNull } from "drizzle-orm";
import { db, schema } from "@/db";
import { actionContext, audit } from "@/lib/context";
import { currentUser, destroySession, newToken, sha256, verifyPassword } from "@/lib/auth";
import { safe, str, bool } from "@/lib/form";
import { sanitizePermissions } from "@/lib/permissions";
import { validateLmp } from "@/lib/pregnancy";
import type { ActionResult } from "@/components/forms";

async function owner() {
  const ctx = await actionContext();
  if (!ctx.isOwner) throw new Error("Only the account owner can change this.");
  return ctx;
}

export async function updateProfile(_: ActionResult, fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    const ctx = await owner();
    const lmp = str(fd, "lmpDate");
    const err = validateLmp(lmp);
    if (err) return { error: err };
    const clinical = str(fd, "clinicalDueDate") || null;
    let method = (str(fd, "datingMethod") || "LMP") as "LMP" | "ULTRASOUND" | "CLINICIAN";
    if (!clinical) method = "LMP";
    await db.update(schema.pregnancies).set({
      preferredName: str(fd, "preferredName") || ctx.pregnancy.preferredName, greeting: str(fd, "greeting"),
      lmpDate: lmp, clinicalDueDate: clinical, datingMethod: method, ultrasoundConfirmed: bool(fd, "ultrasoundConfirmed"),
      allergies: str(fd, "allergies"), dietaryPreferences: str(fd, "dietary"), nauseaTriggers: str(fd, "triggers"), toleratedAtStart: str(fd, "tolerated"),
    }).where(eq(schema.pregnancies.id, ctx.pregnancy.id));
    revalidatePath("/", "layout");
    return { ok: true, message: "Saved." };
  });
}

export type InviteResult = { ok?: boolean; error?: string; message?: string; link?: string } | null;
export async function createInvite(_: InviteResult, fd: FormData): Promise<InviteResult> {
  const r = await safe(async () => {
    const ctx = await owner();
    const perms = sanitizePermissions(fd.getAll("perm").map(String));
    if (!bool(fd, "consent")) return { error: "Please confirm you're choosing to share this information." };
    if (!perms.length) return { error: "Choose at least one thing to share." };
    // One active partner at a time: revoke any previous active grant.
    await db.update(schema.partnerAccess).set({ revokedAt: new Date() })
      .where(and(eq(schema.partnerAccess.pregnancyId, ctx.pregnancy.id), isNull(schema.partnerAccess.revokedAt)));
    const token = newToken();
    await db.insert(schema.partnerAccess).values({ pregnancyId: ctx.pregnancy.id, inviteTokenHash: sha256(token), permissions: perms, consentAt: new Date() });
    await audit(ctx, "partner.invite_created", perms.join(","));
    // The raw token is never stored; it's shown once via the URL right after creation.
    redirect(`/settings?invite=${token}#partner`);
    return null;
  });
  return r as InviteResult;
}

export async function updatePartnerPermissions(_: ActionResult, fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    const ctx = await owner();
    const perms = sanitizePermissions(fd.getAll("perm").map(String));
    await db.update(schema.partnerAccess).set({ permissions: perms, consentAt: new Date() })
      .where(and(eq(schema.partnerAccess.id, str(fd, "id")), eq(schema.partnerAccess.pregnancyId, ctx.pregnancy.id)));
    await audit(ctx, "partner.permissions_changed", perms.join(","));
    revalidatePath("/settings");
    return { ok: true, message: "Sharing updated — takes effect immediately." };
  });
}

export async function revokePartner(fd: FormData) {
  const ctx = await owner();
  await db.update(schema.partnerAccess).set({ revokedAt: new Date() })
    .where(and(eq(schema.partnerAccess.id, str(fd, "id")), eq(schema.partnerAccess.pregnancyId, ctx.pregnancy.id)));
  await audit(ctx, "partner.revoked");
  revalidatePath("/settings");
}

export async function acceptInvite(fd: FormData) {
  const user = await currentUser();
  const token = str(fd, "token");
  if (!user) redirect(`/login?next=/invite/${token}`);
  const invite = await db.query.partnerAccess.findFirst({ where: and(eq(schema.partnerAccess.inviteTokenHash, sha256(token)), isNull(schema.partnerAccess.revokedAt), isNull(schema.partnerAccess.acceptedAt)) });
  if (!invite) redirect("/invite/invalid");
  const preg = await db.query.pregnancies.findFirst({ where: eq(schema.pregnancies.id, invite.pregnancyId) });
  if (!preg || preg.ownerId === user.id) redirect("/invite/invalid");
  const ownsPregnancy = await db.query.pregnancies.findFirst({ where: eq(schema.pregnancies.ownerId, user.id) });
  if (ownsPregnancy) redirect("/invite/invalid?reason=owner");
  await db.update(schema.partnerAccess).set({ partnerUserId: user.id, acceptedAt: new Date() }).where(eq(schema.partnerAccess.id, invite.id));
  await db.insert(schema.auditLogs).values({ actorId: user.id, pregnancyId: preg.id, action: "partner.accepted" });
  redirect("/partner");
}

export async function saveReminders(_: ActionResult, fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    const ctx = await owner();
    for (const kind of ["FLUIDS", "MEALS", "SUPPLEMENTS", "CHECKIN", "GROCERIES"]) {
      const times = str(fd, `times_${kind}`).split(",").map((t) => t.trim()).filter((t) => /^\d{2}:\d{2}$/.test(t));
      const enabled = bool(fd, `on_${kind}`);
      await db.insert(schema.reminders).values({ pregnancyId: ctx.pregnancy.id, kind, enabled, times })
        .onConflictDoUpdate({ target: [schema.reminders.pregnancyId, schema.reminders.kind], set: { enabled, times } });
    }
    const qs = str(fd, "quietStart"), qe = str(fd, "quietEnd");
    if (/^\d{2}:\d{2}$/.test(qs) && /^\d{2}:\d{2}$/.test(qe)) await db.update(schema.pregnancies).set({ quietHoursStart: qs, quietHoursEnd: qe }).where(eq(schema.pregnancies.id, ctx.pregnancy.id));
    revalidatePath("/", "layout");
    return { ok: true, message: "Reminder settings saved." };
  });
}

export async function deleteAccount(_: ActionResult, fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    const user = await currentUser();
    if (!user) redirect("/login");
    if (str(fd, "confirm") !== "DELETE") return { error: 'Type DELETE to confirm.' };
    if (!(await verifyPassword(fd.get("password")?.toString() ?? "", user.passwordHash))) return { error: "Password is incorrect." };
    // Cascades remove the pregnancy and every record linked to it, sessions and partner grants.
    await destroySession();
    await db.delete(schema.users).where(eq(schema.users.id, user.id));
    redirect("/login?deleted=1");
  });
}
