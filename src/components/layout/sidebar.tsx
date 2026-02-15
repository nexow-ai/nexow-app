"use client";

import { cn } from "@/lib/utils";
import {
  Bot,
  Copy,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Plus,
  Sparkles,
  Trophy,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "./logo";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "My Agents", href: "/agents", icon: Bot },
  { name: "Create Agent", href: "/agents/new", icon: Plus },
  { name: "Wall of Fame", href: "/leaderboard", icon: Trophy },
  { name: "Copy Trading", href: "/copy", icon: Copy },
  { name: "Pricing", href: "/pricing", icon: Sparkles },
  { name: "Billing", href: "/billing", icon: CreditCard },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-zinc-800/40 bg-zinc-950/80 backdrop-blur-xl">
      {/* Logo */}
      <div className="flex h-16 items-center px-6">
        <Logo />
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 px-3 py-6">
        {navigation.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-emerald-500/10 text-emerald-400"
                  : "text-zinc-500 hover:bg-zinc-800/40 hover:text-zinc-200"
              )}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-emerald-500" />
              )}
              <item.icon className={cn(
                "h-[18px] w-[18px] transition-colors",
                isActive ? "text-emerald-400" : "text-zinc-600 group-hover:text-zinc-400"
              )} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Divider with gradient */}
      <div className="mx-4 h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />

      {/* Sign out */}
      <div className="p-3">
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-zinc-600 transition-all duration-200 hover:bg-zinc-800/40 hover:text-zinc-300"
        >
          <LogOut className="h-[18px] w-[18px]" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
