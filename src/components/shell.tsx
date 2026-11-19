import Link from "next/link";
import {
  Home, Utensils, CalendarDays, Frown, GlassWater, BookOpen, ShoppingBasket, Pill, Sprout, CalendarClock, BarChart3, Settings, Menu, HeartHandshake, LogOut, Camera, ClipboardCheck, ListChecks,
} from "lucide-react";
import type { ReactNode } from "react";
import { can, type Access, type Permission } from "@/lib/permissions";
import { ThemeToggle, QuickLog } from "./client-bits";

type NavItem = { href: string; label: string; short?: string; icon: typeof Home; perm?: Permission; ownerOnly?: boolean; main?: boolean };

// The four main tabs (plus "More"): what matters most day to day. Everything else lives under More.
export const NAV: NavItem[] = [
  { href: "/", label: "Today", icon: Home, ownerOnly: true, main: true },
  { href: "/partner", label: "Home", icon: HeartHandshake, main: true },
  { href: "/food", label: "Food", icon: Utensils, perm: "VIEW_MEALS", main: true },
  { href: "/planner", label: "Plan & Shop", short: "Plan", icon: CalendarDays, perm: "MEAL_PLAN", main: true },
  { href: "/appointments", label: "Appointments", short: "Appts", icon: CalendarClock, perm: "APPOINTMENTS", main: true },
  // More
  { href: "/check-in", label: "How I feel today", icon: ClipboardCheck, ownerOnly: true },
  // No perm: photo-check results are always visible to an accepted partner (owner's choice).
  { href: "/food/photo", label: "Photo food check", icon: Camera },
  { href: "/symptoms", label: "Nausea & symptoms", icon: Frown, perm: "VIEW_SYMPTOMS" },
  { href: "/hydration", label: "Drinks", icon: GlassWater, perm: "VIEW_HYDRATION" },
  { href: "/groceries", label: "Shopping list & budget", icon: ShoppingBasket, perm: "GROCERIES" },
  { href: "/planner/foods", label: "Her food list", icon: ListChecks },
  { href: "/supplements", label: "Supplements", icon: Pill, perm: "VIEW_SUPPLEMENTS" },
  { href: "/journey", label: "Pregnancy journey", icon: Sprout, perm: "VIEW_JOURNEY" },
  { href: "/guide", label: "Food safety guide", icon: BookOpen },
  { href: "/reports", label: "Reports", icon: BarChart3, ownerOnly: true },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function visibleNav(access: Access) {
  return NAV.filter((n) => {
    if (n.href === "/partner") return access.role === "PARTNER";
    if (n.ownerOnly) return access.role === "OWNER";
    return !n.perm || can(access, n.perm);
  });
}

export function Shell({ access, name, children, banner }: { access: Access; name: string; children: ReactNode; banner?: ReactNode }) {
  const items = visibleNav(access);
  const main = items.filter((i) => i.main);
  const isOwner = access.role === "OWNER";
  const canLog = isOwner || can(access, "LOG_FOR_ME");
  return (
    <div className="min-h-dvh md:flex">
      <aside className="no-print sticky top-0 hidden h-dvh w-72 shrink-0 flex-col border-r border-line bg-white/70 px-4 py-6 backdrop-blur md:flex dark:border-night-line dark:bg-night-card/60">
        <Link href={isOwner ? "/" : "/partner"} className="mb-6 px-2">
          <div className="font-display text-2xl font-semibold">Bloom<span className="text-rose">Care</span></div>
          <div className="text-xs text-muted dark:text-white/60">Nourishing you, caring for your little one.</div>
        </Link>
        <nav className="flex-1 space-y-1 overflow-y-auto" aria-label="Main">
          {[...main, { href: "/more", label: "More", icon: Menu }].map((i) => (
            <Link key={i.href} href={i.href} className="flex min-h-12 items-center gap-3 rounded-2xl px-3 text-base font-semibold hover:bg-blush/60 dark:hover:bg-night-line">
              <i.icon size={21} className="text-rose/90 dark:text-blush-deep" /> {i.label}
            </Link>
          ))}
        </nav>
        <div className="mt-4 flex items-center justify-between border-t border-line pt-4 dark:border-night-line">
          <div className="truncate px-2 text-sm"><div className="font-semibold">{name}</div><div className="text-xs text-muted dark:text-white/60">{isOwner ? "Your space" : "Partner access"}</div></div>
          <div className="flex"><ThemeToggle />
            <form action="/api/logout" method="post"><button aria-label="Sign out" className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-2xl hover:bg-blush/60 dark:hover:bg-night-line"><LogOut size={19} /></button></form>
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="no-print sticky top-0 z-30 flex items-center justify-between border-b border-line bg-ivory/90 px-4 py-2 backdrop-blur md:hidden dark:border-night-line dark:bg-night/90">
          <Link href={isOwner ? "/" : "/partner"} className="font-display text-xl font-semibold">Bloom<span className="text-rose">Care</span></Link>
          <ThemeToggle />
        </header>
        {banner}
        <main className="mx-auto max-w-6xl px-4 pb-36 pt-6 md:px-8 md:pb-16">{children}</main>
      </div>

      <nav aria-label="Quick navigation" className="no-print fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden dark:border-night-line dark:bg-night-card/95">
        {main.slice(0, 4).map((i) => (
          <Link key={i.href} href={i.href} className="flex min-h-16 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold">
            <i.icon size={22} className="text-rose dark:text-blush-deep" /> {i.short ?? i.label}
          </Link>
        ))}
        <Link href="/more" className="flex min-h-16 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold">
          <Menu size={22} className="text-rose dark:text-blush-deep" /> More
        </Link>
      </nav>
      {canLog && <QuickLog canLogSymptoms={isOwner} />}
    </div>
  );
}
