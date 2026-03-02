"use client";

import { cn } from "@/lib/utils";
import { useSidebar } from "./sidebar-context";

export function DashboardContent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { collapsed } = useSidebar();
  return (
    <div
      className={cn(
        "flex flex-1 flex-col transition-[padding] duration-200",
        collapsed ? "pl-[72px]" : "pl-64",
        className
      )}
    >
      {children}
    </div>
  );
}
