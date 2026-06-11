"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, CalendarDays, Trophy, MessageCircle, User } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/dashboard", label: "Hub", icon: Home },
  { href: "/matches", label: "Matchs", icon: CalendarDays },
  { href: "/leaderboard", label: "Classement", icon: Trophy },
  { href: "/chat", label: "Tchat", icon: MessageCircle },
  { href: "/profile", label: "Profil", icon: User },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 pb-[env(safe-area-inset-bottom)]">
      <div className="absolute inset-0 glass-strong" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--color-border-medium)] to-transparent" />
      <ul className="relative mx-auto flex max-w-md items-stretch justify-around px-2 pt-1.5 pb-2">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active =
            pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={cn(
                  "group relative flex flex-col items-center gap-0.5 py-1.5 text-[10px] font-medium transition-all duration-200",
                  active
                    ? "text-[var(--color-pitch-bright)]"
                    : "text-[var(--color-muted)] hover:text-[var(--color-cream)]"
                )}
              >
                {active && (
                  <span className="absolute -top-1.5 left-1/2 h-0.5 w-6 -translate-x-1/2 rounded-full bg-[var(--color-pitch-bright)] transition-all duration-300" />
                )}
                <span
                  className={cn(
                    "flex size-9 items-center justify-center rounded-xl transition-all duration-200",
                    active
                      ? "bg-[var(--color-pitch)]/15 scale-110"
                      : "group-hover:bg-[var(--color-surface-2)] group-hover:scale-105"
                  )}
                >
                  <Icon
                    className={cn(
                      "size-[18px] transition-all duration-200",
                      active && "drop-shadow-[0_0_8px_var(--color-pitch-bright)]"
                    )}
                    strokeWidth={active ? 2.5 : 1.8}
                  />
                </span>
                <span
                  className={cn(
                    "transition-all duration-200",
                    active && "font-semibold"
                  )}
                >
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
