import { and, desc, eq, isNull } from "drizzle-orm";
import { User, HeartHandshake, Bell, Shield, Trash2 } from "lucide-react";
import { db, schema } from "@/db";
import { requireContext } from "@/lib/context";
import { PERMISSIONS, SUGGESTED_PERMISSIONS, ALL_PERMISSIONS } from "@/lib/permissions";
import { formatDateTime, todayISO } from "@/lib/dates";
import { Card, CardTitle, PageHeader, Field, Input, Select, Check, Note, Badge } from "@/components/ui";
import { ActionForm, Submit, InlineAction } from "@/components/forms";
import { InviteForm } from "@/components/invite-form";
import { EnableNotifications, ThemeToggle, CopyText } from "@/components/client-bits";
import { sha256 } from "@/lib/auth";
import { updateProfile, createInvite, updatePartnerPermissions, revokePartner, saveReminders, deleteAccount } from "@/app/actions/settings";

const REMINDER_KINDS = [["FLUIDS", "Fluids"], ["MEALS", "Optional meal check-ins"], ["SUPPLEMENTS", "Supplements (approved only)"], ["CHECKIN", "Daily wellness check-in"], ["GROCERIES", "Grocery shopping"]];

export default async function Settings({ searchParams }: { searchParams: Promise<{ invite?: string }> }) {
  const ctx = await requireContext();
  const inviteToken = (await searchParams).invite;
  if (!ctx.isOwner) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <PageHeader title="Settings" />
        <Card><CardTitle icon={<HeartHandshake size={18} />}>Your partner access</CardTitle>
          <p className="text-[15px]">You&apos;re connected to {ctx.pregnancy.preferredName}&apos;s BloomCare. She chooses what you can see, and can change or revoke it at any time.</p>
          <ul className="mt-3 flex flex-wrap gap-1">{ctx.access.permissions.map((p) => <Badge key={p} tone="info">{PERMISSIONS[p].label}</Badge>)}</ul>
        </Card>
        <Card><CardTitle>Appearance</CardTitle><div className="flex items-center gap-2"><ThemeToggle /> Light / dark mode</div></Card>
        <AccountDelete />
      </div>
    );
  }
  const p = ctx.pregnancy;
  const [grants, reminders, auditRows] = await Promise.all([
    db.select({ g: schema.partnerAccess, u: schema.users }).from(schema.partnerAccess).leftJoin(schema.users, eq(schema.users.id, schema.partnerAccess.partnerUserId))
      .where(and(eq(schema.partnerAccess.pregnancyId, p.id), isNull(schema.partnerAccess.revokedAt))),
    db.select().from(schema.reminders).where(eq(schema.reminders.pregnancyId, p.id)),
    db.select().from(schema.auditLogs).where(eq(schema.auditLogs.pregnancyId, p.id)).orderBy(desc(schema.auditLogs.createdAt)).limit(15),
  ]);
  const permOptions = ALL_PERMISSIONS.map((k) => ({ key: k, label: PERMISSIONS[k].label, group: PERMISSIONS[k].group, suggested: SUGGESTED_PERMISSIONS.includes(k) }));

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" subtitle="Your profile, partner sharing, reminders and privacy." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle icon={<User size={18} />}>Profile & pregnancy dates</CardTitle>
          <ActionForm action={updateProfile} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Preferred name"><Input name="preferredName" defaultValue={p.preferredName} /></Field>
              <Field label="Dashboard greeting"><Input name="greeting" defaultValue={p.greeting} placeholder="e.g. my love ❤️" /></Field>
              <Field label="First day of last period"><Input type="date" name="lmpDate" defaultValue={p.lmpDate} max={todayISO()} required /></Field>
              <Field label="Clinical due date (from scan/clinician)"><Input type="date" name="clinicalDueDate" defaultValue={p.clinicalDueDate ?? ""} /></Field>
              <Field label="Clinical date source"><Select name="datingMethod" defaultValue={p.datingMethod}><option value="LMP">None — use last period</option><option value="ULTRASOUND">Ultrasound</option><option value="CLINICIAN">Doctor / midwife</option></Select></Field>
            </div>
            <Check name="ultrasoundConfirmed" label="Ultrasound has confirmed the pregnancy is in the womb" defaultChecked={p.ultrasoundConfirmed} />
            <Field label="Allergies"><Input name="allergies" defaultValue={p.allergies} /></Field>
            <Field label="Dietary preferences"><Input name="dietary" defaultValue={p.dietaryPreferences} /></Field>
            <Field label="Foods tolerated (starting list)"><Input name="tolerated" defaultValue={p.toleratedAtStart} /></Field>
            <Field label="Nausea triggers"><Input name="triggers" defaultValue={p.nauseaTriggers} /></Field>
            <Submit>Save profile</Submit>
          </ActionForm>
        </Card>

        <Card id="partner" className="scroll-mt-20">
          <CardTitle icon={<HeartHandshake size={18} />}>Partner access</CardTitle>
          <p className="mb-3 text-[15px]">You decide exactly what your partner sees. Nothing is shared until you create an invite and they accept it.</p>
          {grants.length > 0 ? grants.map(({ g, u }) => (
            <div key={g.id} className="space-y-3 rounded-2xl bg-ivory p-4 dark:bg-night">
              <p className="font-semibold">{u ? `${u.name} (${u.email})` : "Invite not accepted yet"}</p>
              <p className="text-sm text-muted">Consent given {formatDateTime(g.consentAt)}{g.acceptedAt && ` · accepted ${formatDateTime(g.acceptedAt)}`}</p>
              {!g.acceptedAt && inviteToken && sha256(inviteToken) === g.inviteTokenHash && (
                <div className="space-y-2 rounded-2xl bg-sage/40 p-3 dark:bg-sage-deep/20">
                  <p className="text-sm font-semibold">Invite created. Send this private link to your partner — it works once and is only shown now.</p>
                  <CopyText text={`${process.env.APP_URL ?? "http://localhost:3000"}/invite/${inviteToken}`} />
                  <p className="text-xs text-muted">Share it privately (e.g. WhatsApp). Your partner creates their own account, then accepts.</p>
                </div>
              )}
              <ActionForm action={updatePartnerPermissions} className="space-y-2">
                <input type="hidden" name="id" value={g.id} />
                <div className="grid gap-2 sm:grid-cols-2">
                  {permOptions.map((o) => (
                    <label key={o.key} className="flex min-h-11 items-center gap-3 rounded-2xl border border-line bg-white px-3 text-sm dark:border-night-line dark:bg-night-card">
                      <input type="checkbox" name="perm" value={o.key} defaultChecked={g.permissions.includes(o.key)} />{o.label}
                    </label>
                  ))}
                </div>
                <Submit variant="soft">Update sharing</Submit>
              </ActionForm>
              <InlineAction action={revokePartner} fields={{ id: g.id }} variant="danger" confirm={g.acceptedAt ? "Revoke partner access now?" : "Cancel this invite?"}>{g.acceptedAt ? "Revoke access now" : "Cancel invite / make a new link"}</InlineAction>
            </div>
          )) : <InviteForm action={createInvite} perms={permOptions} />}
        </Card>

        <Card>
          <CardTitle icon={<Bell size={18} />}>Reminders</CardTitle>
          <ActionForm action={saveReminders} className="space-y-3">
            {REMINDER_KINDS.map(([k, l]) => {
              const r = reminders.find((x) => x.kind === k);
              return (
                <div key={k} className="grid items-center gap-2 sm:grid-cols-2">
                  <Check name={`on_${k}`} label={l} defaultChecked={r?.enabled} />
                  <Input name={`times_${k}`} defaultValue={r?.times.join(", ") ?? ""} placeholder="Times, e.g. 09:00, 13:00" aria-label={`${l} times`} />
                </div>
              );
            })}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Quiet hours start"><Input type="time" name="quietStart" defaultValue={p.quietHoursStart} /></Field>
              <Field label="Quiet hours end"><Input type="time" name="quietEnd" defaultValue={p.quietHoursEnd} /></Field>
            </div>
            <Submit variant="soft">Save reminders</Submit>
          </ActionForm>
          <div className="mt-3"><EnableNotifications /></div>
          <Note className="mt-2">Reminders appear while BloomCare is open in a browser tab on this device. They never nag about missed meals, and safety warnings are always shown inside the app — never only as a notification.</Note>
        </Card>

        <Card>
          <CardTitle icon={<Shield size={18} />}>Privacy & your data</CardTitle>
          <ul className="list-disc space-y-1 pl-5 text-[15px]">
            <li>Your health records are visible only to you, plus whatever you share with your partner.</li>
            <li>Partner views of sensitive areas are logged below.</li>
            <li>You can download everything, or delete your account and all records permanently.</li>
          </ul>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- file download from an API route */}
          <a href="/api/export/all" className="mt-3 inline-flex min-h-11 items-center rounded-2xl bg-blush px-4 font-semibold dark:bg-night-line">Download all my data (JSON)</a>
          <p className="mt-4 text-sm font-semibold">Recent access log</p>
          <ul className="mt-1 max-h-48 space-y-1 overflow-auto text-sm text-muted">{auditRows.length ? auditRows.map((a) => <li key={a.id}>{formatDateTime(a.createdAt)} · {a.action}{a.detail ? ` · ${a.detail}` : ""}</li>) : <li>No activity yet.</li>}</ul>
          <div className="mt-4 flex items-center gap-2"><ThemeToggle /> <span className="text-sm">Light / dark mode</span></div>
        </Card>
      </div>
      <AccountDelete owner />
    </div>
  );
}

function AccountDelete({ owner = false }: { owner?: boolean }) {
  return (
    <Card className="border-red-200 dark:border-red-900">
      <CardTitle icon={<Trash2 size={18} />}>Delete account</CardTitle>
      <p className="mb-3 text-[15px]">{owner ? "Permanently deletes your account, pregnancy records, logs, plans and partner access. This can't be undone — download your data first if you want a copy." : "Deletes your partner account. Her records are not affected."}</p>
      <ActionForm action={deleteAccount} className="grid gap-3 sm:grid-cols-3">
        <Field label='Type "DELETE"'><Input name="confirm" autoComplete="off" /></Field>
        <Field label="Your password"><Input type="password" name="password" autoComplete="current-password" /></Field>
        <div className="flex items-end"><Submit variant="danger">Delete permanently</Submit></div>
      </ActionForm>
    </Card>
  );
}
