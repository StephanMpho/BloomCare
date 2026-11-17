import Link from "next/link";
import { requirePermission } from "@/lib/context";
import { nowHHMM, todayISO } from "@/lib/dates";
import { saveFoodLog, createCustomFood } from "@/app/actions/logs";
import { FoodLogForm } from "@/components/food-form";
import { Card, PageHeader, Field, Input, Select, Note } from "@/components/ui";
import { ActionForm, Submit } from "@/components/forms";
import { foodFormData } from "../shared";

export default async function NewFood({ searchParams }: { searchParams: Promise<{ meal?: string; name?: string }> }) {
  const ctx = await requirePermission("LOG_FOR_ME");
  const sp = await searchParams;
  const { foods, favourites } = await foodFormData(ctx.pregnancy.ownerId, ctx.pregnancy.id);
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="Log food" subtitle={ctx.isOwner ? "Quick and simple — only the first few fields matter." : `Logging on behalf of ${ctx.pregnancy.preferredName}.`}
        action={<Link href="/food" className="text-sm underline">Back to diary</Link>} />
      <Card><FoodLogForm foods={foods} favourites={favourites} action={saveFoodLog} initial={{ date: todayISO(), time: nowHHMM(), mealType: sp.meal, foodName: sp.name }} /></Card>
      <Card>
        <details>
          <summary className="cursor-pointer font-semibold">Add your own food (e.g. a specific brand)</summary>
          <ActionForm action={createCustomFood} resetOnSuccess className="mt-4 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Name"><Input name="name" required /></Field>
              <Field label="Category"><Select name="category">{["Grains & starches", "Fruit", "Vegetables", "Protein", "Dairy", "Fats & spreads", "Snacks", "Drinks", "Processed meat"].map((c) => <option key={c}>{c}</option>)}</Select></Field>
              <Field label="Serving description"><Input name="servingLabel" placeholder="e.g. 2 slices" /></Field>
              <Field label="Serving weight (g)"><Input name="servingGrams" inputMode="decimal" /></Field>
            </div>
            <p className="text-sm font-semibold">Per 100 g from the pack label (optional — leave blank if not on the label)</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[["proteinG", "Protein g"], ["carbsG", "Carbs g"], ["fatG", "Fat g"], ["fibreG", "Fibre g"], ["ironMg", "Iron mg"], ["calciumMg", "Calcium mg"], ["folateUg", "Folate µg"]].map(([k, l]) => <Field key={k} label={l}><Input name={k} inputMode="decimal" /></Field>)}
            </div>
            <Note>Blank values stay blank — BloomCare never guesses missing nutrients.</Note>
            <Submit variant="soft">Add food</Submit>
          </ActionForm>
        </details>
      </Card>
    </div>
  );
}
