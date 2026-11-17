"use client";
import { useActionState } from "react";
import { Submit } from "./forms";
import { CopyText } from "./client-bits";
import type { InviteResult } from "@/app/actions/settings";

type Perm = { key: string; label: string; group: string; suggested: boolean };

export function InviteForm({ action, perms }: { action: (p: InviteResult, fd: FormData) => Promise<InviteResult>; perms: Perm[] }) {
  const [state, formAction] = useActionState(action, null);
  if (state?.ok && state.link) {
    return (
      <div className="space-y-3">
        <p className="rounded-2xl bg-sage/40 p-3 text-sm">{state.message}</p>
        <CopyText text={state.link} />
        <p className="text-xs text-muted">Share it privately (e.g. WhatsApp). Your partner creates their own account, then accepts. You can revoke access at any time.</p>
      </div>
    );
  }
  const groups = [...new Set(perms.map((p) => p.group))];
  return (
    <form action={formAction} className="space-y-4">
      {groups.map((g) => (
        <fieldset key={g}>
          <legend className="mb-1.5 text-sm font-semibold">{g === "View" ? "They can see" : "They can help with"}</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {perms.filter((p) => p.group === g).map((p) => (
              <label key={p.key} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-2xl border border-line bg-white px-3.5 dark:border-night-line dark:bg-night">
                <input type="checkbox" name="perm" value={p.key} defaultChecked={p.suggested} /><span className="text-[15px]">{p.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ))}
      <label className="flex items-start gap-3 rounded-2xl bg-blush/50 p-3 dark:bg-night-line">
        <input type="checkbox" name="consent" className="mt-1" />
        <span className="text-[15px]">I choose to share the selected information with my partner. I can change or revoke this at any time.</span>
      </label>
      {state?.error && <p className="rounded-2xl bg-red-50 p-3 text-sm text-red-800">{state.error}</p>}
      <Submit variant="rose">Create private invite link</Submit>
    </form>
  );
}
