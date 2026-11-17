import Link from "next/link";
import {
  Home, Utensils, CalendarDays, Frown, GlassWater, BookOpen, ShoppingBasket, Pill, Sprout, CalendarClock, BarChart3, Settings, Menu, HeartHandshake, LogOut, Camera,
} from "lucide-react";
import type { ReactNode } from "react";
import { can, type Access, type Permission } from "@/lib/permissions";
import { ThemeToggle, QuickLog } from "./client-bits";

type NavItem = { href: string; label: string; icon: typeof Home; perm?: Permission; ownerOnly?: boolean; group: string };

export const NAV: NavItem[] = [
  { href: "/", label: "Dashboard", icon: Home, group: "Today", ownerOnly: true },
  { href: "/partner", label: "Partner view", icon: HeartHandshake, group: "Today" },
  { href: "/food", label: "Food Diary", icon: Utensils, perm: "VIEW_MEALS", group: "Today" },
  // No perm: photo-check results are always visible to an accepted partner (owner's choice).
  { href: "/food/photo", label: "Photo Check", icon: Camera, group: "Today" },
  { href: "/symptoms", label: "Nausea & Symptoms", icon: Frown, perm: "VIEW_SYMPTOMS", group: "Today" },
  { href: "/hydration", label: "Hydration", icon: GlassWater, perm: "VIEW_HYDRATION", group: "Today" },
  { href: "/planner", label: "Meal Planner", icon: CalendarDays, perm: "MEAL_PLAN", group: "Plan" },
  { href: "/groceries", label: "Grocery Budget", icon: ShoppingBasket, perm: "GROCERIES", group: "Plan" },
  { href: "/supplements", label: "Supplements", icon: Pill, perm: "VIEW_SUPPLEMENTS", group: "Plan" },
  { href: "/appointments", label: "Appointments", icon: CalendarClock, perm: "APPOINTMENTS", group: "Plan" },
  { href: "/guide", label: "Nutrition & Food Safety", icon: BookOpen, group: "Learn" },
  { href: "/journey", label: "Pregnancy Journey", icon: Sprout, perm: "VIEW_JOURNEY", group: "Learn" },
  { href: "/reports", label: "Reports", icon: BarChart3, ownerOnly: true, group: "Learn" },
  { href: "/settings", label: "Settings", icon: Settings, group: "Account" },
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
  const groups = [...new Set(items.map((i) => i.group))];
  const isOwner = access.role === "OWNER";
  const bottom = isOwner
    ? [items.find((i) => i.href === "/")!, items.find((i) => i.href === "/food")!, items.find((i) => i.href === "/symptoms")!, items.find((i) => i.href === "/planner")!]
    : items.filter((i) => i.href !== "/settings").slice(0, 4);
  const canLog = isOwner || can(access, "LOG_FOR_ME");
  return (
    <div className="min-h-dvh md:flex">
      <aside className="no-print sticky top-0 hidden h-dvh w-72 shrink-0 flex-col border-r border-line bg-white/70 px-4 py-6 backdrop-blur md:flex dark:border-night-line dark:bg-night-card/60">
        <Link href={isOwner ? "/" : "/partner"} className="mb-6 px-2">
          <div className="font-display text-2xl font-semibold">Bloom<span className="text-rose">Care</span></div>
          <div className="text-xs text-muted dark:text-white/60">Nourishing you, caring for your little one.</div>
        </Link>
        <nav className="flex-1 space-y-5 overflow-y-auto" aria-label="Main">
          {groups.map((g) => (
            <div key={g}>
              <div className="mb-1 px-3 text-[11px] font-bold uppercase tracking-widest text-muted/80 dark:text-white/40">{g}</div>
              {items.filter((i) => i.group === g).map((i) => (
                <Link key={i.href} href={i.href} className="flex min-h-11 items-center gap-3 rounded-2xl px-3 text-[15px] font-medium hover:bg-blush/60 dark:hover:bg-night-line">
                  <i.icon size={19} className="text-rose/90 dark:text-blush-deep" /> {i.label}
                </Link>
              ))}
            </div>
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
        {bottom.filter(Boolean).map((i) => (
          <Link key={i.href} href={i.href} className="flex min-h-16 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold">
            <i.icon size={22} className="text-rose dark:text-blush-deep" /> {i.label.split(" ")[0]}
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
