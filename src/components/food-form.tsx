"use client";
import { useMemo, useState } from "react";
import { Search, Star, AlertTriangle } from "lucide-react";
import { ActionForm, Submit, type ActionResult } from "./forms";
import { Field, Input, Select, Textarea, Choice, Check, cx } from "./ui";

type Food = { id: string; name: string; category: string; servingLabel: string; servingGrams: number; safetyNote: string | null; nutrientSource: string; custom: boolean };
type Initial = {
  id?: string; foodId?: string | null; foodName?: string; mealType?: string; date: string; time: string; portionLabel?: string; grams?: number | null;
  preparation?: string; amountEaten?: string; tolerance?: string; nauseaAfter?: boolean; vomitedAfter?: boolean; favourite?: boolean; notes?: string;
};

const MEALS = [["BREAKFAST", "Breakfast"], ["MORNING_SNACK", "Morning snack"], ["LUNCH", "Lunch"], ["AFTERNOON_SNACK", "Afternoon snack"], ["SUPPER", "Supper"], ["EVENING_SNACK", "Evening snack"]];

export function suggestMeal(hhmm: string) {
  const h = Number(hhmm.slice(0, 2));
  if (h < 10) return "BREAKFAST"; if (h < 12) return "MORNING_SNACK"; if (h < 14) return "LUNCH"; if (h < 17) return "AFTERNOON_SNACK"; if (h < 20) return "SUPPER"; return "EVENING_SNACK";
}

export function FoodLogForm({ foods, favourites, initial, action }: {
  foods: Food[]; favourites: string[]; initial: Initial; action: (p: ActionResult, fd: FormData) => Promise<ActionResult>;
}) {
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<Food | null>(foods.find((f) => f.id === initial.foodId) ?? null);
  const [name, setName] = useState(initial.foodName ?? "");
  const [portion, setPortion] = useState(initial.portionLabel ?? "");
  const [grams, setGrams] = useState<string>(initial.grams != null ? String(initial.grams) : "");
  const results = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return [];
    return foods.filter((f) => f.name.toLowerCase().includes(t)).slice(0, 8);
  }, [q, foods]);

  function choose(f: Food) {
    setPicked(f); setName(f.name); setPortion(f.servingLabel); setGrams(String(f.servingGrams)); setQ("");
  }
  function chooseName(n: string) {
    const f = foods.find((x) => x.name.toLowerCase() === n.toLowerCase());
    if (f) choose(f); else { setPicked(null); setName(n); }
  }

  return (
    <ActionForm action={action} className="space-y-5">
      {initial.id && <input type="hidden" name="id" value={initial.id} />}
      <input type="hidden" name="foodId" value={picked?.id ?? ""} />
      <input type="hidden" name="grams" value={picked ? grams : ""} />

      <div>
        <Field label="What did you eat?">
          <div className="relative">
            <Search size={18} className="pointer-events-none absolute left-3.5 top-3.5 text-muted" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search: oats, banana, pap, eggs…" className="pl-10" aria-label="Search foods" />
          </div>
        </Field>
        {results.length > 0 && (
          <ul className="mt-2 overflow-hidden rounded-2xl border border-line bg-white dark:border-night-line dark:bg-night">
            {results.map((f) => (
              <li key={f.id}><button type="button" onClick={() => choose(f)} className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-blush/50 dark:hover:bg-night-line">
                <span className="font-medium">{f.name}</span><span className="text-xs text-muted">{f.category}{f.custom ? " · yours" : ""}</span></button></li>
            ))}
          </ul>
        )}
        {q.trim() && results.length === 0 && (
          <button type="button" onClick={() => { chooseName(q.trim()); setQ(""); }} className="mt-2 w-full rounded-2xl border border-dashed border-blush-deep px-4 py-3 text-left text-sm">
            Use &quot;<strong>{q.trim()}</strong>&quot; as a custom food (no nutrient data)
          </button>
        )}
        {favourites.length > 0 && !name && (
          <div className="mt-3"><p className="mb-1 flex items-center gap-1 text-xs font-semibold text-muted"><Star size={14} /> Favourites & recent</p>
            <div className="flex flex-wrap gap-2">{favourites.map((f) => <button key={f} type="button" onClick={() => chooseName(f)} className="min-h-10 rounded-2xl bg-blush/70 px-3 text-sm font-medium dark:bg-night-line">{f}</button>)}</div>
          </div>
        )}
      </div>

      <Field label="Food name"><Input name="foodName" value={name} onChange={(e) => { setName(e.target.value); if (picked && e.target.value !== picked.name) setPicked(null); }} required /></Field>
      {picked?.safetyNote && <p className="flex gap-2 rounded-2xl bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-100"><AlertTriangle size={18} className="shrink-0" /> {picked.safetyNote}</p>}
      {picked && <p className="text-xs text-muted">Nutrient data: {picked.nutrientSource}</p>}

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Meal">
          <Select name="mealType" defaultValue={initial.mealType ?? suggestMeal(initial.time)}>{MEALS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select>
        </Field>
        <Field label="Date"><Input type="date" name="date" defaultValue={initial.date} required /></Field>
        <Field label="Time"><Input type="time" name="time" defaultValue={initial.time} required /></Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Portion" hint={picked ? `Standard serving ≈ ${picked.servingGrams} g` : undefined}><Input name="portionLabel" value={portion} onChange={(e) => setPortion(e.target.value)} placeholder="e.g. half a bowl" /></Field>
        {picked && <Field label="Approx. grams (for nutrient estimate)"><Input inputMode="decimal" value={grams} onChange={(e) => setGrams(e.target.value)} /></Field>}
      </div>
      <div><p className="mb-1.5 text-sm font-semibold">How much did you eat?</p>
        <Choice name="amountEaten" defaultValue={initial.amountEaten ?? "FULL"} options={[{ value: "FULL", label: "All of it" }, { value: "PARTIAL", label: "About half" }, { value: "FEW_BITES", label: "A few bites" }]} /></div>
      <div><p className="mb-1.5 text-sm font-semibold">How did it sit with you?</p>
        <Choice name="tolerance" required defaultValue={initial.tolerance} options={[{ value: "GOOD", label: "😊 Well" }, { value: "OKAY", label: "😐 Okay" }, { value: "POOR", label: "😣 Not well" }]} /></div>
      <div className="grid gap-2 sm:grid-cols-3">
        <Check name="nauseaAfter" label="Nausea after" defaultChecked={initial.nauseaAfter} />
        <Check name="vomitedAfter" label="Vomited after" defaultChecked={initial.vomitedAfter} />
        <Check name="favourite" label="Save as favourite" defaultChecked={initial.favourite} />
      </div>
      <details className={cx("rounded-2xl border border-line p-3 dark:border-night-line")}>
        <summary className="cursor-pointer text-sm font-semibold">More details (optional)</summary>
        <div className="mt-3 space-y-3">
          <Field label="Preparation"><Input name="preparation" defaultValue={initial.preparation} placeholder="e.g. toasted, boiled, heated until steaming" /></Field>
          <Field label="Notes"><Textarea name="notes" defaultValue={initial.notes} placeholder="e.g. Ate slowly and managed to keep it down." /></Field>
        </div>
      </details>
      <Submit variant="rose" className="w-full sm:w-auto">{initial.id ? "Save changes" : "Save"}</Submit>
    </ActionForm>
  );
}
