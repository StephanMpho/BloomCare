"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Moon, Sun, Plus, X, Utensils, GlassWater, Frown, Droplets, ClipboardCheck } from "lucide-react";

export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => setDark(document.documentElement.classList.contains("dark")), []);
  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try { localStorage.setItem("bloom-theme", next ? "dark" : "light"); } catch {}
  }
  return (
    <button onClick={toggle} aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-2xl hover:bg-blush/60 dark:hover:bg-night-line">
      {dark ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  );
}

/** Floating "Log" button with quick entry choices. */
export function QuickLog({ canLogSymptoms = true }: { canLogSymptoms?: boolean }) {
  const [open, setOpen] = useState(false);
  const items = [
    { href: "/food/new", label: "Log food", icon: Utensils },
    { href: "/hydration#log", label: "Log drink", icon: GlassWater },
    ...(canLogSymptoms ? [
      { href: "/symptoms#log", label: "Log nausea", icon: Frown },
      { href: "/symptoms?vomit=1#log", label: "Record vomiting", icon: Droplets },
      { href: "/check-in", label: "Daily check-in", icon: ClipboardCheck },
    ] : []),
  ];
  return (
    <div className="no-print fixed bottom-24 right-4 z-40 md:bottom-8 md:right-8">
      {open && (
        <div className="mb-3 flex flex-col items-end gap-2 animate-rise">
          {items.map((i) => (
            <Link key={i.href} href={i.href} onClick={() => setOpen(false)}
              className="flex min-h-12 items-center gap-3 rounded-2xl bg-white px-4 font-semibold shadow-soft ring-1 ring-line dark:bg-night-card dark:ring-night-line">
              <i.icon size={20} className="text-rose" /> {i.label}
            </Link>
          ))}
        </div>
      )}
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label="Quick log"
        className="ml-auto flex h-16 items-center gap-2 rounded-full bg-rose px-6 text-lg font-semibold text-white shadow-lg shadow-rose/30">
        {open ? <X size={24} /> : <Plus size={24} />} Log
      </button>
    </div>
  );
}

/**
 * In-app reminders. Runs while the app is open in a tab: shows a browser
 * notification (if permitted) or an on-screen nudge at the configured times,
 * respecting quiet hours. Background push is not implemented (see README).
 */
export function ReminderRunner({ reminders, quietStart, quietEnd }: {
  reminders: { kind: string; label: string; times: string[] }[]; quietStart: string; quietEnd: string;
}) {
  const [nudge, setNudge] = useState<string | null>(null);
  useEffect(() => {
    if (!reminders.length) return;
    const fired = new Set<string>();
    const inQuiet = (hhmm: string) => (quietStart <= quietEnd ? hhmm >= quietStart && hhmm < quietEnd : hhmm >= quietStart || hhmm < quietEnd);
    const tick = () => {
      const hhmm = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Johannesburg", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date());
      if (inQuiet(hhmm)) return;
      for (const r of reminders) {
        for (const t of r.times) {
          const key = `${r.kind}-${t}-${new Date().toDateString()}`;
          if (t === hhmm && !fired.has(key)) {
            fired.add(key);
            const text = r.label;
            if ("Notification" in window && Notification.permission === "granted") new Notification("BloomCare", { body: text });
            else setNudge(text);
          }
        }
      }
    };
    const id = setInterval(tick, 20_000);
    tick();
    return () => clearInterval(id);
  }, [reminders, quietStart, quietEnd]);
  if (!nudge) return null;
  return (
    <div role="status" className="no-print fixed left-1/2 top-4 z-50 flex w-[min(92vw,28rem)] -translate-x-1/2 items-start gap-3 rounded-2xl bg-white p-4 shadow-soft ring-1 ring-line dark:bg-night-card dark:ring-night-line">
      <span className="text-sm">{nudge}</span>
      <button onClick={() => setNudge(null)} aria-label="Dismiss" className="ml-auto"><X size={18} /></button>
    </div>
  );
}

export function EnableNotifications() {
  const [state, setState] = useState<string>("unknown");
  useEffect(() => setState("Notification" in window ? Notification.permission : "unsupported"), []);
  if (state === "unsupported") return <p className="text-sm text-muted">This browser does not support notifications; reminders will show on screen while the app is open.</p>;
  if (state === "granted") return <p className="text-sm text-sage-deep">Browser notifications are on for this device.</p>;
  return (
    <button type="button" onClick={async () => setState(await Notification.requestPermission())}
      className="inline-flex min-h-11 items-center rounded-2xl bg-blush px-4 font-semibold dark:bg-night-line">
      Allow notifications on this device
    </button>
  );
}

export function CopyText({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex gap-2">
      <input readOnly value={text} className="min-h-11 w-full rounded-2xl border border-line bg-ivory px-3 text-sm dark:border-night-line dark:bg-night" onFocus={(e) => e.target.select()} />
      <button type="button" onClick={async () => { await navigator.clipboard.writeText(text); setCopied(true); }}
        className="min-h-11 shrink-0 rounded-2xl bg-charcoal px-4 font-semibold text-white">{copied ? "Copied" : "Copy"}</button>
    </div>
  );
}
