"use client";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { Camera, ImageUp, Loader2, Plus, RotateCcw, Trash2, AlertCircle, Eye } from "lucide-react";
import { identifyPhoto, checkFoods, type PhotoState } from "@/app/actions/photo";
import { Button, Input, Note, Select } from "./ui";
import { FOOD_GROUPS, FOOD_GROUP_KEYS, type FoodGroupKey } from "@/lib/content/food-groups";

type Row = { key: number; name: string; preparation: string; group: FoodGroupKey };
import { Submit } from "./forms";
import { OverallVerdict, VerdictList } from "./photo-verdict-view";

const MAX_EDGE = 1280;

/** Shrink to a JPEG of at most 1280px on the long edge before upload (phone photos are often 5–12 MB). */
async function shrink(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", 0.85));
  if (!blob) throw new Error("Could not process the photo.");
  return new File([blob], "meal.jpg", { type: "image/jpeg" });
}

function ErrorLine({ text }: { text: string }) {
  return (
    <p role="alert" className="flex items-start gap-2 rounded-2xl bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-900/30 dark:text-red-200">
      <AlertCircle size={18} className="mt-0.5 shrink-0" /> {text}
    </p>
  );
}

export function PhotoCheck({ partnerWillSee, partnerName }: { partnerWillSee: boolean; partnerName?: string }) {
  // Each photo gets a fresh <Flow> (new key), so no state leaks between checks.
  const [run, setRun] = useState<{ key: number; photo: File; preview: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const camRef = useRef<HTMLInputElement>(null);
  const libRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => { if (run) URL.revokeObjectURL(run.preview); }, [run]);

  async function onFile(input: HTMLInputElement) {
    const f = input.files?.[0];
    input.value = ""; // allow picking the same photo again
    if (!f) return;
    setError(null);
    try {
      const photo = await shrink(f);
      setRun({ key: Date.now(), photo, preview: URL.createObjectURL(photo) });
    } catch {
      setError("We couldn't open that photo. Please try a different one.");
    }
  }

  return (
    <div className="space-y-4">
      {partnerWillSee && (
        <p className="flex items-start gap-2 rounded-2xl bg-lavender/50 px-3 py-2 text-sm dark:bg-lavender-deep/30">
          <Eye size={18} className="mt-0.5 shrink-0" aria-hidden />
          <span><strong>{partnerName ?? "Your partner"} will see the result of this check</strong> (the food names and verdict, not the photo).</span>
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <input ref={camRef} type="file" accept="image/*" capture="environment" className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => onFile(e.currentTarget)} />
        <input ref={libRef} type="file" accept="image/*" className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => onFile(e.currentTarget)} />
        <Button type="button" variant="rose" onClick={() => camRef.current?.click()}><Camera size={18} /> Take a photo</Button>
        <Button type="button" variant="outline" onClick={() => libRef.current?.click()}><ImageUp size={18} /> Choose from gallery</Button>
        {run && <Button type="button" variant="ghost" onClick={() => setRun(null)}><RotateCcw size={18} /> Start again</Button>}
      </div>

      {error && <ErrorLine text={error} />}
      {run && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview only */}
          <img src={run.preview} alt="Your meal photo" className="max-h-64 w-full rounded-3xl object-cover" />
          <Flow key={run.key} photo={run.photo} />
        </>
      )}
    </div>
  );
}

function Flow({ photo }: { photo: File }) {
  const [idState, identify] = useActionState<PhotoState, FormData>(identifyPhoto, null);
  const [checkState, check] = useActionState<PhotoState, FormData>(checkFoods, null);
  const [pending, startTransition] = useTransition();
  const [rows, setRows] = useState<Row[] | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return; // React dev mode runs effects twice; only call the API once
    started.current = true;
    const fd = new FormData();
    fd.set("photo", photo);
    startTransition(() => identify(fd));
  }, [photo, identify]);

  if (pending || !idState) return <p className="flex items-center gap-2 text-sm"><Loader2 size={16} className="animate-spin" /> Looking at the photo…</p>;
  if ("error" in idState) return <ErrorLine text={idState.error} />;

  if (checkState && "step" in checkState && checkState.step === "result") {
    return (
      <div className="space-y-3" aria-live="polite">
        <OverallVerdict level={checkState.overall} />
        <VerdictList items={checkState.items} canLog />
      </div>
    );
  }
  if (idState.step !== "confirm") return null;

  const editable = rows ?? idState.items.map((it, i) => ({ key: i, name: it.name, preparation: it.preparation, group: it.group }));
  const update = (key: number, patch: Partial<Omit<Row, "key">>) =>
    setRows(editable.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  return (
    <form action={check} className="space-y-3">
      <p className="font-semibold">Is this what&apos;s on the plate?</p>
      <p className="text-sm text-muted dark:text-white/60">Fix any names or food groups, remove anything wrong, or add what the photo missed. The verdict comes from BloomCare&apos;s reviewed food-safety and healthy-eating guidance, not from the AI.</p>
      {idState.note && <Note>{idState.note}</Note>}
      <ul className="space-y-2">
        {editable.map((r) => (
          <li key={r.key} className="grid grid-cols-[1fr_auto] gap-2 rounded-2xl border border-line p-2 dark:border-night-line sm:grid-cols-[1fr_1fr_1fr_auto]">
            <Input name="name" value={r.name} onChange={(e) => update(r.key, { name: e.target.value })} aria-label="Food" required maxLength={80} />
            <Input name="preparation" value={r.preparation} onChange={(e) => update(r.key, { preparation: e.target.value })} aria-label="How it's prepared" placeholder="How it's prepared" maxLength={120} className="col-span-2 sm:col-span-1" />
            <Select name="group" value={r.group} onChange={(e) => update(r.key, { group: e.target.value as FoodGroupKey })} aria-label="Food group" className="col-span-2 sm:col-span-1">
              {FOOD_GROUP_KEYS.map((k) => <option key={k} value={k}>{FOOD_GROUPS[k].label}</option>)}
            </Select>
            <Button type="button" variant="ghost" aria-label={`Remove ${r.name || "this food"}`} onClick={() => setRows(editable.filter((x) => x.key !== r.key))}><Trash2 size={18} /></Button>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="soft" disabled={editable.length >= 12} onClick={() => setRows([...editable, { key: Date.now(), name: "", preparation: "", group: "other" }])}><Plus size={18} /> Add a food</Button>
        <Submit>Check these foods</Submit>
      </div>
      {checkState && "error" in checkState && <ErrorLine text={checkState.error} />}
    </form>
  );
}
