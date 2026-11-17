import Link from "next/link";
import { and, eq, isNull } from "drizzle-orm";
import { db, schema } from "@/db";
import { currentUser, sha256 } from "@/lib/auth";
import { PERMISSIONS, sanitizePermissions } from "@/lib/permissions";
import { acceptInvite } from "@/app/actions/settings";
import { Submit } from "@/components/forms";

export default async function Invite({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ reason?: string }> }) {
  const { token } = await params;
  const sp = await searchParams;
  const wrap = (c: React.ReactNode) => (
    <div className="flex min-h-dvh items-center justify-center bg-gradient-to-br from-blush via-ivory to-lavender/60 px-4 dark:from-night dark:to-night-card">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-soft dark:bg-night-card">
        <div className="mb-4 font-display text-3xl font-semibold">Bloom<span className="text-rose">Care</span></div>{c}
      </div>
    </div>
  );
  const invalid = token === "invalid";
  const invite = invalid ? null : await db.query.partnerAccess.findFirst({ where: and(eq(schema.partnerAccess.inviteTokenHash, sha256(token)), isNull(schema.partnerAccess.revokedAt), isNull(schema.partnerAccess.acceptedAt)) });
  if (!invite) return wrap(<p>{sp.reason === "revoked" ? "Your partner access has been turned off. She can invite you again whenever she chooses." : sp.reason === "owner" ? "This account already has its own pregnancy profile, so it can't also be a partner account. Please use a separate account." : "This invite link has expired, was already used, or was revoked. Ask her to create a new one."}</p>);
  const preg = await db.query.pregnancies.findFirst({ where: eq(schema.pregnancies.id, invite.pregnancyId) });
  const user = await currentUser();
  return wrap(
    <>
      <h1 className="text-xl font-semibold">{preg?.preferredName} has invited you to BloomCare</h1>
      <p className="mt-2 text-[15px]">She has chosen to share:</p>
      <ul className="mt-1 list-disc pl-5 text-[15px]">{sanitizePermissions(invite.permissions).map((p) => <li key={p}>{PERMISSIONS[p].label}</li>)}</ul>
      <p className="mt-3 text-sm text-muted">She can change or revoke this at any time. Please use it to support, not to monitor.</p>
      {user ? (
        <form action={acceptInvite} className="mt-4"><input type="hidden" name="token" value={token} /><Submit variant="rose" className="w-full">Accept as {user.name}</Submit></form>
      ) : (
        <div className="mt-4 flex gap-2">
          <Link href={`/register?next=/invite/${token}`} className="flex min-h-11 flex-1 items-center justify-center rounded-2xl bg-rose font-semibold text-white">Create account</Link>
          <Link href={`/login?next=/invite/${token}`} className="flex min-h-11 flex-1 items-center justify-center rounded-2xl bg-blush font-semibold">Sign in</Link>
        </div>
      )}
    </>
  );
}
