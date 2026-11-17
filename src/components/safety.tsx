import Link from "next/link";
import { AlertTriangle, Siren, Phone, Info } from "lucide-react";
import { acknowledgeAlert } from "@/app/actions/logs";
import { InlineAction } from "./forms";
import { cx } from "./ui";
import type { ActiveAlert } from "@/lib/safety-status";
import { EMERGENCY_TEXT, URGENT_TEXT, EMERGENCY_NUMBERS } from "@/lib/safety";
import { formatDateTime } from "@/lib/dates";

/** Banner for currently-active alerts. Emergency alerts never collapse. */
export function AlertBanner({ alerts, canAck, compact = false }: { alerts: ActiveAlert[]; canAck: boolean; compact?: boolean }) {
  if (!alerts.length) return null;
  return (
    <div className="space-y-3">
      {alerts.map((a) => {
        const collapsed = compact && a.acknowledgedAt && a.level !== "EMERGENCY";
        const styles = a.level === "EMERGENCY"
          ? "border-red-700 bg-red-50 text-red-950 dark:bg-red-950/60 dark:text-red-50"
          : a.level === "URGENT" ? "border-amber-600 bg-amber-50 text-amber-950 dark:bg-amber-950/50 dark:text-amber-50"
          : "border-lavender-deep bg-lavender/40 text-charcoal dark:bg-lavender-deep/30 dark:text-white";
        const Icon = a.level === "EMERGENCY" ? Siren : a.level === "URGENT" ? AlertTriangle : Info;
        return (
          <div key={a.id} role={a.level === "EMERGENCY" ? "alert" : "status"} className={cx("rounded-3xl border-2 p-4", styles)}>
            <div className="flex items-start gap-3">
              <Icon className="mt-0.5 shrink-0" size={24} />
              <div className="min-w-0 flex-1">
                <p className="font-bold">Medical safety notice · {a.title}</p>
                {!collapsed && <p className="mt-1 text-[15px]">{a.message}</p>}
                <p className="mt-1 text-sm"><span className="font-semibold">Recorded in the last 24 hours:</span> {a.reasons.join(" · ")}</p>
                {!collapsed && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {a.level !== "CONTACT_CLINICIAN" && (
                      <a href="tel:10177" className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-red-700 px-4 font-semibold text-white"><Phone size={16} /> Call ambulance 10177</a>
                    )}
                    <Link href="/symptoms#when-to-get-help" className="inline-flex min-h-11 items-center rounded-2xl bg-white/80 px-4 font-semibold text-charcoal ring-1 ring-black/10">When to get help</Link>
                    {canAck && !a.acknowledgedAt && a.level !== "EMERGENCY" && (
                      <InlineAction action={acknowledgeAlert} fields={{ alertType: a.id }} variant="outline" className="min-h-11 text-[15px]">I&apos;ve read this</InlineAction>
                    )}
                  </div>
                )}
                {a.acknowledgedAt && <p className="mt-2 text-xs opacity-80">Read {formatDateTime(a.acknowledgedAt)}. Reading this notice doesn&apos;t mean the symptoms have been checked by a clinician.</p>}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Onboarding / first-use urgent notice — must be acknowledged before normal tracking starts. */
export function InitialUrgentNotice({ next }: { next: string }) {
  return (
    <div role="alert" className="rounded-3xl border-2 border-amber-600 bg-amber-50 p-6 text-amber-950 dark:bg-amber-950/50 dark:text-amber-50">
      <div className="flex items-center gap-3"><AlertTriangle size={28} /><h2 className="text-xl font-bold">Please get urgent medical assessment</h2></div>
      <p className="mt-3 text-[16px]">
        The symptoms you&apos;ve described — such as repeated vomiting, difficulty keeping fluids down, weight loss, dizziness, weakness
        or abdominal/pelvic pain — need to be checked by a doctor or clinic <strong>today</strong>. This is more than ordinary morning sickness,
        and food tracking alone can&apos;t fix it. Effective, pregnancy-safe treatment exists (for example anti-sickness medicine and fluids).
      </p>
      <p className="mt-3 text-[16px]">
        Because the pregnancy hasn&apos;t been confirmed on ultrasound yet, abdominal or pelvic pain also needs to be assessed to make sure the pregnancy is in the right place.
      </p>
      <ul className="mt-3 list-disc space-y-1 pl-5 text-[15px]">
        <li><strong>Emergency:</strong> {EMERGENCY_TEXT}</li>
        <li><strong>Urgent:</strong> {URGENT_TEXT}</li>
        <li>{EMERGENCY_NUMBERS}</li>
      </ul>
      <div className="mt-4 flex flex-wrap gap-2">
        <a href="tel:10177" className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-red-700 px-5 font-semibold text-white"><Phone size={18} /> Call 10177</a>
        <InlineAction action={acknowledgeAlert} fields={{ alertType: "INITIAL_URGENT", next }} variant="primary" className="min-h-12 px-5 text-[15px]">
          I&apos;ve read this — continue
        </InlineAction>
      </div>
      <p className="mt-3 text-sm opacity-80">Continuing only records that you&apos;ve read this notice. It does not mean you&apos;ve been assessed or that the symptoms have resolved.</p>
    </div>
  );
}

export function WhenToGetHelp() {
  return (
    <div id="when-to-get-help" className="space-y-3 scroll-mt-20">
      <div className="rounded-2xl border-l-4 border-red-700 bg-red-50 p-4 dark:bg-red-950/40">
        <p className="font-bold text-red-900 dark:text-red-100">Emergency — go now / call 10177 or 112</p>
        <p className="mt-1 text-[15px]">{EMERGENCY_TEXT}</p>
      </div>
      <div className="rounded-2xl border-l-4 border-amber-600 bg-amber-50 p-4 dark:bg-amber-950/40">
        <p className="font-bold text-amber-900 dark:text-amber-100">Urgent — contact a doctor or clinic today</p>
        <p className="mt-1 text-[15px]">{URGENT_TEXT} Also: fever, vomiting blood, a racing heart, confusion, or being unable to keep any food down for 24 hours.</p>
      </div>
      <div className="rounded-2xl border-l-4 border-lavender-deep bg-lavender/40 p-4 dark:bg-lavender-deep/20">
        <p className="font-bold">Discuss at your next visit (or sooner if worried)</p>
        <p className="mt-1 text-[15px]">Any spotting, ongoing nausea that stops you eating normally, or questions about anti-sickness medicine.</p>
      </div>
      <p className="text-xs text-muted dark:text-white/60">BloomCare can&apos;t diagnose hyperemesis gravidarum, dehydration or ectopic pregnancy — only a clinician can. These notices exist to help you decide when to get care.</p>
    </div>
  );
}
