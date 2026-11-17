"use server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { and, eq, gt, isNull } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { createSession, hashPassword, verifyPassword, rateLimited, newToken, sha256 } from "@/lib/auth";
import { safe, str } from "@/lib/form";
import type { ActionResult } from "@/components/forms";

const password = z.string().min(10, "Use at least 10 characters for your password.").max(200);
const email = z.string().email("Please enter a valid email address.").max(200).transform((e) => e.toLowerCase());

async function clientKey(prefix: string, extra: string) {
  const h = await headers();
  return `${prefix}:${h.get("x-forwarded-for")?.split(",")[0] ?? "local"}:${extra}`;
}

export async function registerAction(_: ActionResult, fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    const data = z.object({ name: z.string().min(1, "Please enter your name.").max(80), email, password }).parse({
      name: str(fd, "name"), email: str(fd, "email"), password: fd.get("password")?.toString() ?? "",
    });
    if (!fd.get("privacy")) return { error: "Please confirm you've read how your data is used." };
    const exists = await db.query.users.findFirst({ where: eq(schema.users.email, data.email) });
    if (exists) return { error: "An account with this email already exists. Try signing in." };
    const [user] = await db.insert(schema.users).values({ name: data.name, email: data.email, passwordHash: await hashPassword(data.password) }).returning();
    await createSession(user.id);
    const next = str(fd, "next");
    redirect(next.startsWith("/invite/") ? next : "/onboarding");
  });
}

export async function loginAction(_: ActionResult, fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    const e = str(fd, "email").toLowerCase();
    if (rateLimited(await clientKey("login", e))) return { error: "Too many attempts. Please wait 15 minutes and try again." };
    const user = await db.query.users.findFirst({ where: eq(schema.users.email, e) });
    const ok = user && (await verifyPassword(fd.get("password")?.toString() ?? "", user.passwordHash));
    if (!ok) return { error: "That email and password don't match." };
    await createSession(user.id);
    const next = str(fd, "next");
    redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/");
  });
}

/**
 * Password reset. No email provider is configured by default, so the reset link
 * is written to the server log (development). Set up an email provider for
 * production — see README "Password reset emails".
 */
export async function forgotAction(_: ActionResult, fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    const e = str(fd, "email").toLowerCase();
    if (rateLimited(await clientKey("reset", e), 5)) return { error: "Too many requests. Please try later." };
    const user = await db.query.users.findFirst({ where: eq(schema.users.email, e) });
    if (user) {
      const token = newToken();
      await db.insert(schema.passwordResetTokens).values({ tokenHash: sha256(token), userId: user.id, expiresAt: new Date(Date.now() + 3600_000) });
      const url = `${process.env.APP_URL ?? "http://localhost:3000"}/reset/${token}`;
      console.info(`[BloomCare] Password reset link for ${e}: ${url}`);
    }
    return { ok: true, message: "If that email has an account, a reset link has been sent. (In local development the link appears in the server log.)" };
  });
}

export async function resetAction(_: ActionResult, fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    const token = str(fd, "token");
    const pw = password.parse(fd.get("password")?.toString() ?? "");
    const row = await db.query.passwordResetTokens.findFirst({
      where: and(eq(schema.passwordResetTokens.tokenHash, sha256(token)), isNull(schema.passwordResetTokens.usedAt), gt(schema.passwordResetTokens.expiresAt, new Date())),
    });
    if (!row) return { error: "This reset link has expired or was already used." };
    await db.update(schema.users).set({ passwordHash: await hashPassword(pw) }).where(eq(schema.users.id, row.userId));
    await db.update(schema.passwordResetTokens).set({ usedAt: new Date() }).where(eq(schema.passwordResetTokens.id, row.id));
    await db.delete(schema.sessions).where(eq(schema.sessions.userId, row.userId)); // sign out everywhere
    await createSession(row.userId);
    redirect("/");
  });
}
