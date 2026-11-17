import { redirect } from "next/navigation";
import { requireContext } from "@/lib/context";
import { Card, PageHeader, Field, Input, Choice, Textarea, Note } from "@/components/ui";
import { ActionForm, Submit, RangeField } from "@/components/forms";
import { saveCheckIn } from "@/app/actions/logs";

const five = (labels: string[]) => labels.map((l, i) => ({ value: String(i + 1), label: l }));

export default async function CheckIn() {
  const ctx = await requireContext();
  if (!ctx.isOwner) redirect("/partner");
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Daily check-in" subtitle="About a minute. Skip anything you like." />
      <ActionForm action={saveCheckIn} className="space-y-4">
        <Card><p className="mb-2 font-semibold">1. How are you feeling today?</p><Choice name="mood" options={five(["😞 Rough", "🙁 Low", "😐 Okay", "🙂 Good", "😊 Great"])} /></Card>
        <Card><p className="mb-2 font-semibold">2. How severe is your nausea?</p><RangeField name="nauseaSeverity" label="Nausea" defaultValue={3} left="0 · none" right="10 · worst" /></Card>
        <Card><Field label="3. How many times have you vomited today?"><Input type="number" name="vomitCount" min={0} max={50} inputMode="numeric" /></Field></Card>
        <Card><p className="mb-2 font-semibold">4. Have you managed to keep fluids down?</p><Choice name="fluidsKeptDown" options={[{ value: "KEPT_DOWN", label: "Yes" }, { value: "PARTLY", label: "Some" }, { value: "NOT_KEPT_DOWN", label: "No" }]} /></Card>
        <Card><p className="mb-2 font-semibold">5. How is your appetite?</p><Choice name="appetite" options={five(["None", "Low", "Some", "Okay", "Good"])} />
          <p className="mb-2 mt-4 font-semibold">Energy</p><Choice name="energy" options={five(["Exhausted", "Low", "Some", "Okay", "Good"])} /></Card>
        <Card><p className="mb-2 font-semibold">6. Do you feel dizzy or unusually weak?</p><Choice name="dizzyOrWeak" options={[{ value: "no", label: "No" }, { value: "yes", label: "Yes" }]} /></Card>
        <Card><p className="mb-2 font-semibold">7. Do you have abdominal pain or bleeding?</p><Choice name="painOrBleeding" options={[{ value: "no", label: "No" }, { value: "yes", label: "Yes" }]} />
          <Note className="mt-2">If yes, please also record details on the Symptoms page. Severe pain, fainting, shoulder-tip pain or heavy bleeding — call 10177 or go to casualty now.</Note></Card>
        <Card><Field label="8. Is there anything your partner can help you with today?"><Input name="partnerRequest" placeholder="e.g. buy crackers, cook supper outside" /></Field>
          <Field label="Anything else? (optional)" className="mt-3"><Textarea name="notes" rows={2} /></Field></Card>
        <Submit variant="rose" className="w-full">Save check-in</Submit>
      </ActionForm>
    </div>
  );
}
