import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { requireContext } from "@/lib/context";
import { visibleNav } from "@/components/shell";
import { PageHeader } from "@/components/ui";
import { ThemeToggle } from "@/components/client-bits";
import { InstallApp } from "@/components/install-app";

export default async function More() {
  const ctx = await requireContext();
  const items = visibleNav(ctx.access).filter((i) => !i.main);
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="More" />
      <div className="mb-4"><InstallApp /></div>
      <ul className="overflow-hidden rounded-3xl bg-white shadow-soft dark:bg-night-card">
        {items.map((i) => (
          <li key={i.href} className="border-b border-line last:border-0 dark:border-night-line">
            <Link href={i.href} className="flex min-h-14 items-center gap-3 px-4 text-[16px] font-semibold hover:bg-blush/40 dark:hover:bg-night-line">
              <i.icon size={21} className="text-rose dark:text-blush-deep" />
              <span className="flex-1">{i.label}</span>
              <ChevronRight size={18} className="text-muted" />
            </Link>
          </li>
        ))}
      </ul>
      <div className="mt-6 flex items-center justify-between rounded-3xl bg-white p-4 shadow-soft dark:bg-night-card">
        <span className="flex items-center gap-2"><ThemeToggle /> Light / dark</span>
        <form action="/api/logout" method="post"><button className="min-h-11 rounded-2xl bg-blush px-4 font-semibold dark:bg-night-line">Sign out</button></form>
      </div>
    </div>
  );
}
