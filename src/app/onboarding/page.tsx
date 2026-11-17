import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { currentUser } from "@/lib/auth";
import { getContext } from "@/lib/context";
import { initialNotice } from "@/lib/safety-status";
import { ActionForm, Submit } from "@/components/forms";
import { Card, Field, Input, Select, Choice, Check, Note } from "@/components/ui";
import { InitialUrgentNotice } from "@/components/safety";
import { onboardingStepOne, onboardingStepTwo } from "@/app/actions/onboarding";
import { todayISO, formatDate } from "@/lib/dates";
import { calculateDating } from "@/lib/pregnancy";

export default async function Onboarding({ searchParams }: { searchParams: Promise<{ step?: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/login");
  const ctx = await getContext();
  if (ctx && !ctx.isOwner) redirect("/partner");
  if (ctx?.pregnancy.onboardedAt) redirect("/");
  const step = (await searchParams).step ?? "1";
  const preg = ctx?.pregnancy ?? (await db.query.pregnancies.findFirst({ where: eq(schema.pregnancies.ownerId, user.id) }));

  if (step === "safety" && ctx) {
    const n = await initialNotice(ctx);
    if (n?.acknowledgedAt) redirect("/onboarding?step=2");
    return <Frame step={2}><InitialUrgentNotice next="/onboarding?step=2" /></Frame>;
  }

  if (step === "2" && preg) {
    const d = calculateDating({ lmpDate: preg.lmpDate, clinicalDueDate: preg.clinicalDueDate, datingMethod: preg.datingMethod });
    return (
      <Frame step={3}>
        <Card tone="sage" className="mb-4">
          <p className="text-sm font-semibold">By these dates you&apos;re about</p>
          <p className="font-display text-3xl">{d.label}</p>
          <p className="text-sm">Estimated due date {formatDate(d.edd)} · {d.basis === "LMP" ? "based on your last period — your clinic will confirm with a scan" : "from your clinician"}</p>
        </Card>
        <Card>
          <h2 className="mb-1 text-lg font-semibold">A few preferences</h2>
          <p className="mb-4 text-sm text-muted dark:text-white/70">All optional — skip anything you like. You can change these later.</p>
          <ActionForm action={onboardingStepTwo} className="space-y-4">
            <Field label="Foods you can manage right now" hint="Comma-separated, e.g. polony, toast, banana"><Input name="tolerated" defaultValue={preg.toleratedAtStart} /></Field>
            <Field label="Smells or foods that trigger nausea"><Input name="triggers" defaultValue={preg.nauseaTriggers} /></Field>
            <Field label="Allergies"><Input name="allergies" defaultValue={preg.allergies} placeholder="None known" /></Field>
            <Field label="Dietary preferences" hint="e.g. no pork, vegetarian, halal"><Input name="dietary" defaultValue={preg.dietaryPreferences} /></Field>
            <Field label="Monthly grocery budget (R)"><Input name="budget" inputMode="decimal" defaultValue={(preg.monthlyBudgetCents / 100).toString()} /></Field>
            <fieldset className="space-y-2">
              <legend className="mb-1 text-sm font-semibold">Gentle reminders (while the app is open)</legend>
              <Check name="rem_FLUIDS" label="Small sips of fluid through the day" />
              <Check name="rem_CHECKIN" label="Daily wellness check-in" />
              <Check name="rem_MEALS" label="Optional snack check-ins (never guilt-tripping)" />
            </fieldset>
            <Check name="invitePartner" label="I'd like to invite my partner next (I'll choose exactly what they see)" />
            <Submit variant="rose" className="w-full">Finish setup</Submit>
          </ActionForm>
        </Card>
      </Frame>
    );
  }

  return (
    <Frame step={1}>
      <Card>
        <h2 className="mb-1 text-lg font-semibold">Let&apos;s set up your space</h2>
        <p className="mb-4 text-sm text-muted dark:text-white/70">Only what&apos;s needed. Dates are estimates until your clinic confirms them.</p>
        <ActionForm action={onboardingStepOne} className="space-y-5">
          <Field label="What should we call you?"><Input name="preferredName" defaultValue={preg?.preferredName ?? user.name} required /></Field>
          <Field label="Personal greeting (optional)" hint='Shown on your dashboard, e.g. "my love ❤️". Leave blank to use your name.'><Input name="greeting" defaultValue={preg?.greeting ?? ""} /></Field>
          <Field label="First day of your last menstrual period" hint="Used to estimate how many weeks pregnant you are (standard method).">
            <Input name="lmpDate" type="date" max={todayISO()} defaultValue={preg?.lmpDate ?? ""} required />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Due date from a clinician (if you have one)"><Input name="clinicalDueDate" type="date" defaultValue={preg?.clinicalDueDate ?? ""} /></Field>
            <Field label="Where did that date come from?">
              <Select name="datingMethod" defaultValue={preg?.datingMethod ?? "LMP"}>
                <option value="LMP">No clinical date yet</option><option value="ULTRASOUND">Ultrasound scan</option><option value="CLINICIAN">Doctor / midwife</option>
              </Select>
            </Field>
          </div>
          <Check name="ultrasoundConfirmed" label="An ultrasound has confirmed the pregnancy is in the womb" defaultChecked={preg?.ultrasoundConfirmed} />

          <fieldset className="space-y-4 rounded-3xl bg-blush/40 p-4 dark:bg-night">
            <legend className="px-1 text-base font-semibold">How have you been in the last day or two?</legend>
            <Note>This helps BloomCare show the right safety guidance. Answer what you&apos;re comfortable with.</Note>
            <Field label="Times vomited in the last 24 hours"><Input name="vomitCount" type="number" min={0} max={50} inputMode="numeric" /></Field>
            <div><p className="mb-1.5 text-sm font-semibold">Can you keep fluids down?</p>
              <Choice name="fluidsKeptDown" options={[{ value: "KEPT_DOWN", label: "Yes" }, { value: "PARTLY", label: "Some" }, { value: "NOT_KEPT_DOWN", label: "No, they come back up" }]} /></div>
            <div><p className="mb-1.5 text-sm font-semibold">Abdominal or pelvic pain?</p>
              <Choice name="abdominalPain" options={[{ value: "NONE", label: "None" }, { value: "MILD", label: "Some pain" }, { value: "SEVERE", label: "Severe" }]} /></div>
            <div><p className="mb-1.5 text-sm font-semibold">Vaginal bleeding?</p>
              <Choice name="bleeding" options={[{ value: "NONE", label: "None" }, { value: "SPOTTING", label: "Spotting" }, { value: "HEAVY", label: "Heavy" }]} /></div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Check name="weightLoss" label="I've lost weight" />
              <Check name="dizziness" label="Dizziness" />
              <Check name="weakness" label="Unusual weakness" />
              <Check name="reducedUrine" label="Passing less urine / dark urine" />
              <Check name="fainting" label="Fainted or nearly fainted" />
            </div>
          </fieldset>
          <Submit variant="rose" className="w-full">Continue</Submit>
        </ActionForm>
      </Card>
    </Frame>
  );
}

function Frame({ step, children }: { step: number; children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-gradient-to-br from-blush via-ivory to-lavender/50 px-4 py-8 dark:from-night dark:via-night dark:to-night-card">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 text-center">
          <div className="font-display text-3xl font-semibold">Bloom<span className="text-rose">Care</span></div>
          <p className="text-sm text-muted dark:text-white/70">Step {step} of 3</p>
          <div className="mx-auto mt-2 h-1.5 w-40 overflow-hidden rounded-full bg-white dark:bg-night-line"><div className="h-full bg-rose" style={{ width: `${(step / 3) * 100}%` }} /></div>
        </div>
        {children}
      </div>
    </div>
  );
}
