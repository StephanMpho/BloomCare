"use client";
import { useActionState, useEffect, useRef, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { cx, type BtnVariant } from "./ui";

export type ActionResult = { ok?: boolean; error?: string; message?: string } | null;
type Action = (prev: ActionResult, fd: FormData) => Promise<ActionResult>;

export function ActionForm({ action, children, className, resetOnSuccess = false, id }: {
  action: Action; children: ReactNode; className?: string; resetOnSuccess?: boolean; id?: string;
}) {
  const [state, formAction] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok && resetOnSuccess) ref.current?.reset();
  }, [state, resetOnSuccess]);
  return (
    <form ref={ref} action={formAction} className={className} id={id}>
      {children}
      <div aria-live="polite">
        {state?.error && (
          <p className="mt-3 flex items-start gap-2 rounded-2xl bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-900/30 dark:text-red-200">
            <AlertCircle size={18} className="mt-0.5 shrink-0" /> {state.error}
          </p>
        )}
        {state?.ok && state.message && (
          <p className="mt-3 flex items-start gap-2 rounded-2xl bg-sage/40 px-3 py-2 text-sm text-sage-deep dark:bg-sage-deep/30 dark:text-sage">
            <CheckCircle2 size={18} className="mt-0.5 shrink-0" /> {state.message}
          </p>
        )}
      </div>
    </form>
  );
}

const variants: Record<BtnVariant, string> = {
  primary: "bg-charcoal text-white hover:bg-charcoal/90 dark:bg-blush dark:text-charcoal",
  rose: "bg-rose text-white hover:bg-rose/90",
  soft: "bg-blush/70 text-charcoal hover:bg-blush dark:bg-night-line dark:text-white",
  ghost: "bg-transparent hover:bg-blush/50 dark:hover:bg-night-line",
  outline: "border border-line bg-white hover:bg-ivory dark:border-night-line dark:bg-night-card",
  danger: "bg-red-700 text-white hover:bg-red-800",
};

export function Submit({ children, variant = "primary", className, name, value, formNoValidate }: {
  children: ReactNode; variant?: BtnVariant; className?: string; name?: string; value?: string; formNoValidate?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" name={name} value={value} formNoValidate={formNoValidate} disabled={pending}
      className={cx("inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl px-4 py-2 text-[15px] font-semibold transition disabled:opacity-60", variants[variant], className)}>
      {pending && <Loader2 size={16} className="animate-spin" />}
      {children}
    </button>
  );
}

/** Small inline form for one-click actions (status changes, delete, toggle). */
export function InlineAction({ action, fields, children, variant = "ghost", className, confirm }: {
  action: (fd: FormData) => Promise<void>; fields: Record<string, string>; children: ReactNode; variant?: BtnVariant; className?: string; confirm?: string;
}) {
  return (
    <form action={action} onSubmit={(e) => { if (confirm && !window.confirm(confirm)) e.preventDefault(); }} className="inline">
      {Object.entries(fields).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <Submit variant={variant} className={cx("min-h-9 px-3 py-1 text-sm", className)}>{children}</Submit>
    </form>
  );
}

export function RangeField({ name, label, defaultValue = 0, max = 10, left, right }: { name: string; label: string; defaultValue?: number; max?: number; left: string; right: string }) {
  const outRef = useRef<HTMLOutputElement>(null);
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center justify-between text-sm font-semibold">
        {label} <output ref={outRef} className="rounded-full bg-blush px-2.5 py-0.5 text-sm dark:bg-rose/40">{defaultValue}</output>
      </span>
      <input type="range" name={name} min={0} max={max} defaultValue={defaultValue} className="w-full"
        onChange={(e) => { if (outRef.current) outRef.current.textContent = e.target.value; }} />
      <span className="flex justify-between text-xs text-muted dark:text-white/60"><span>{left}</span><span>{right}</span></span>
    </label>
  );
}

export function PrintButton() {
  return <button onClick={() => window.print()} className="no-print inline-flex min-h-11 items-center rounded-2xl bg-charcoal px-4 font-semibold text-white">Print / Save as PDF</button>;
}
