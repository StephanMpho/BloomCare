import Link from "next/link";
import { requireContext } from "@/lib/context";
import { visibleNav } from "@/components/shell";
import { PageHeader } from "@/components/ui";
import { ThemeToggle } from "@/components/client-bits";

export default async function More() {
  const ctx = await requireContext();
  return (
    <div>
      <PageHeader title="Menu" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {visibleNav(ctx.access).map((i) => (
          <Link key={i.href} href={i.href} className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-3xl border border-line bg-white p-3 text-center font-semibold shadow-soft dark:border-night-line dark:bg-night-card">
            <i.icon size={24} className="text-rose" /> {i.label}
          </Link>
        ))}
        <Link href="/check-in" className={ctx.isOwner ? "flex min-h-24 flex-col items-center justify-center gap-2 rounded-3xl border border-line bg-white p-3 text-center font-semibold shadow-soft dark:border-night-line dark:bg-night-card" : "hidden"}>Daily check-in</Link>
      </div>
      <div className="mt-6 flex items-center justify-between rounded-3xl bg-white p-4 shadow-soft dark:bg-night-card">
        <span className="flex items-center gap-2"><ThemeToggle /> Light / dark</span>
        <form action="/api/logout" method="post"><button className="min-h-11 rounded-2xl bg-blush px-4 font-semibold dark:bg-night-line">Sign out</button></form>
      </div>
    </div>
  );
}
