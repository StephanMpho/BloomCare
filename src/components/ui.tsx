import Link from "next/link";
import clsx from "clsx";
import type { ComponentProps, ReactNode } from "react";

export const cx = clsx;

export function Card({ className, children, tone = "plain", ...rest }: ComponentProps<"section"> & { tone?: "plain" | "blush" | "sage" | "lavender" }) {
  const tones = {
    plain: "bg-white dark:bg-night-card",
    blush: "bg-gradient-to-br from-blush/80 to-white dark:from-rose/20 dark:to-night-card",
    sage: "bg-gradient-to-br from-sage/60 to-white dark:from-sage-deep/30 dark:to-night-card",
    lavender: "bg-gradient-to-br from-lavender/80 to-white dark:from-lavender-deep/30 dark:to-night-card",
  };
  return (
    <section className={cx("rounded-3xl border border-line p-5 shadow-soft dark:border-night-line animate-rise", tones[tone], className)} {...rest}>
      {children}
    </section>
  );
}

export function CardTitle({ icon, children, action }: { icon?: ReactNode; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 text-base font-semibold">
        {icon && <span className="text-rose dark:text-blush-deep">{icon}</span>}
        {children}
      </h2>
      {action}
    </div>
  );
}

const btn = {
  primary: "bg-charcoal text-white hover:bg-charcoal/90 dark:bg-blush dark:text-charcoal dark:hover:bg-blush-deep",
  rose: "bg-rose text-white hover:bg-rose/90",
  soft: "bg-blush/70 text-charcoal hover:bg-blush dark:bg-night-line dark:text-white dark:hover:bg-night-line/70",
  ghost: "bg-transparent text-charcoal hover:bg-blush/50 dark:text-white dark:hover:bg-night-line",
  outline: "border border-line bg-white text-charcoal hover:bg-ivory dark:border-night-line dark:bg-night-card dark:text-white",
  danger: "bg-red-700 text-white hover:bg-red-800",
};
export type BtnVariant = keyof typeof btn;
const btnBase = "inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl px-4 py-2 text-[15px] font-semibold transition disabled:opacity-60";

export function Button({ variant = "primary", className, ...rest }: ComponentProps<"button"> & { variant?: BtnVariant }) {
  return <button className={cx(btnBase, btn[variant], className)} {...rest} />;
}

export function LinkButton({ variant = "primary", className, ...rest }: ComponentProps<typeof Link> & { variant?: BtnVariant }) {
  return <Link className={cx(btnBase, btn[variant], className)} {...rest} />;
}

export function Badge({ tone = "neutral", children, className }: { tone?: "neutral" | "good" | "warn" | "bad" | "info" | "rose"; children: ReactNode; className?: string }) {
  const tones = {
    neutral: "bg-ivory text-charcoal border-line dark:bg-night-line dark:text-white dark:border-night-line",
    good: "bg-sage/50 text-sage-deep border-sage dark:bg-sage-deep/30 dark:text-sage",
    warn: "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-800",
    bad: "bg-red-50 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-200 dark:border-red-800",
    info: "bg-lavender/60 text-lavender-deep border-lavender dark:bg-lavender-deep/30 dark:text-lavender",
    rose: "bg-blush text-rose border-blush-deep dark:bg-rose/30 dark:text-blush",
  };
  return <span className={cx("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold", tones[tone], className)}>{children}</span>;
}

const inputCls = "w-full min-h-11 rounded-2xl border border-line bg-white px-3.5 py-2 text-[16px] text-charcoal placeholder:text-muted/70 focus:border-lavender-deep focus:outline-none dark:border-night-line dark:bg-night dark:text-white";

export function Input(props: ComponentProps<"input">) {
  return <input {...props} className={cx(inputCls, props.className)} />;
}
export function Select(props: ComponentProps<"select">) {
  return <select {...props} className={cx(inputCls, "pr-8", props.className)} />;
}
export function Textarea(props: ComponentProps<"textarea">) {
  return <textarea rows={3} {...props} className={cx(inputCls, "py-2.5", props.className)} />;
}

export function Field({ label, hint, children, className }: { label: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <label className={cx("block", className)}>
      <span className="mb-1.5 block text-sm font-semibold">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted dark:text-white/60">{hint}</span>}
    </label>
  );
}

/** Large tappable segmented choice built from radio inputs (works without JS). */
export function Choice({ name, options, defaultValue, required }: { name: string; options: { value: string; label: string; tone?: string }[]; defaultValue?: string; required?: boolean }) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup">
      {options.map((o) => (
        <label key={o.value} className="cursor-pointer">
          <input type="radio" name={name} value={o.value} defaultChecked={defaultValue === o.value} required={required} className="peer sr-only" />
          <span className="inline-flex min-h-11 items-center rounded-2xl border border-line bg-white px-3.5 text-[15px] font-medium transition peer-checked:border-rose peer-checked:bg-blush peer-checked:text-charcoal peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-lavender-deep dark:border-night-line dark:bg-night dark:peer-checked:bg-rose/40 dark:peer-checked:text-white">
            {o.label}
          </span>
        </label>
      ))}
    </div>
  );
}

export function Check({ name, label, defaultChecked, value = "on" }: { name: string; label: string; defaultChecked?: boolean; value?: string }) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-2xl border border-line bg-white px-3.5 dark:border-night-line dark:bg-night">
      <input type="checkbox" name={name} value={value} defaultChecked={defaultChecked} />
      <span className="text-[15px]">{label}</span>
    </label>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">{title}</h1>
        {subtitle && <p className="mt-1 text-muted dark:text-white/70">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}

export function Empty({ icon, title, children }: { icon?: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="rounded-3xl border border-dashed border-blush-deep/70 bg-white/60 p-6 text-center dark:border-night-line dark:bg-night-card/50">
      {icon && <div className="mx-auto mb-2 flex justify-center text-rose">{icon}</div>}
      <p className="font-semibold">{title}</p>
      {children && <div className="mt-1 text-sm text-muted dark:text-white/70">{children}</div>}
    </div>
  );
}

export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide text-muted dark:text-white/60">{label}</div>
      <div className="mt-0.5 text-xl font-semibold leading-tight md:text-2xl">{value}</div>
      {sub && <div className="text-sm text-muted dark:text-white/60">{sub}</div>}
    </div>
  );
}

export function Note({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cx("text-xs leading-relaxed text-muted dark:text-white/60", className)}>{children}</p>;
}
