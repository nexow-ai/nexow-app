"use client";

import { cn } from "@/lib/utils";
import {
  BarChart3,
  Brain,
  Building2,
  Copy,
  CreditCard,
  FlaskConical,
  LayoutDashboard,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Sparkles,
  Trophy,
  Zap,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Logo } from "./logo";
import { useSidebar } from "./sidebar-context";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Markets", href: "/markets", icon: BarChart3 },
  { name: "Strategy Labs", href: "/labs", icon: FlaskConical },
  { name: "My Bots", href: "/bots", icon: Zap },
  { name: "My Agents", href: "/agents", icon: Brain },
  { name: "Saxo Connect", href: "/saxo", icon: Building2 },
  { name: "Wall of Fame", href: "/leaderboard", icon: Trophy },
  { name: "Copy Trading", href: "/copy", icon: Copy },
  { name: "Pricing", href: "/pricing", icon: Sparkles },
  { name: "Billing", href: "/billing", icon: CreditCard },
];

const SIDEBAR_WIDTH_EXPANDED = "w-64";
const SIDEBAR_WIDTH_COLLAPSED = "w-[72px]";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { collapsed, toggle } = useSidebar();

  const handleSignOut = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-30 flex flex-col border-r border-zinc-800/40 bg-zinc-950/80 backdrop-blur-xl transition-[width] duration-200",
        collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED
      )}
    >
      {/* Logo + collapse toggle */}
      <div
        className={cn(
          "flex h-16 items-center border-b border-zinc-800/40",
          collapsed ? "justify-center px-0" : "justify-between px-4"
        )}
      >
        {collapsed ? (
          <Link href="/" className="flex shrink-0 items-center justify-center">
            <Image
              src="/favicon.png"
              alt="Nexow"
              width={32}
              height={32}
              className="h-8 w-8 object-contain"
            />
          </Link>
        ) : (
          <>
            <Logo />
            <button
              type="button"
              onClick={toggle}
              className="rounded-lg p-2 text-zinc-500 transition-colors hover:bg-zinc-800/40 hover:text-zinc-200"
              title="Collapse sidebar"
              aria-label="Collapse sidebar"
            >
              <PanelLeftClose className="h-5 w-5" />
            </button>
          </>
        )}
      </div>

      {/* Nav */}
      <nav
        className={cn(
          "flex-1 space-y-1 py-4 transition-[padding] duration-200",
          collapsed ? "px-2" : "px-3"
        )}
      >
        {navigation.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.name}
              href={item.href}
              title={collapsed ? item.name : undefined}
              className={cn(
                "group relative flex items-center rounded-xl py-2.5 text-sm font-medium transition-all duration-200",
                collapsed ? "justify-center px-0" : "gap-3 px-3",
                isActive
                  ? "bg-emerald-500/10 text-emerald-400"
                  : "text-zinc-500 hover:bg-zinc-800/40 hover:text-zinc-200"
              )}
            >
              {isActive && !collapsed && (
                <div className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-emerald-500" />
              )}
              {isActive && collapsed && (
                <div className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-full bg-emerald-500" />
              )}
              <item.icon
                className={cn(
                  "h-[18px] w-[18px] shrink-0 transition-colors",
                  isActive
                    ? "text-emerald-400"
                    : "text-zinc-600 group-hover:text-zinc-400"
                )}
              />
              {!collapsed && <span>{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Divider with gradient */}
      <div className="mx-4 h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />

      {/* Sign out + expand when collapsed */}
      <div className={cn("p-3", collapsed && "space-y-1")}>
        {collapsed && (
          <button
            type="button"
            onClick={toggle}
            className="flex w-full items-center justify-center rounded-xl py-2.5 text-zinc-500 transition-colors hover:bg-zinc-800/40 hover:text-zinc-200"
            title="Expand sidebar"
            aria-label="Expand sidebar"
          >
            <PanelLeftOpen className="h-5 w-5" />
          </button>
        )}
        <button
          onClick={handleSignOut}
          title={collapsed ? "Sign Out" : undefined}
          className={cn(
            "flex w-full items-center rounded-xl py-2.5 text-sm font-medium text-zinc-600 transition-all duration-200 hover:bg-zinc-800/40 hover:text-zinc-300",
            collapsed ? "justify-center px-0" : "gap-3 px-3"
          )}
        >
          <LogOut className="h-[18px] w-[18px] shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}
