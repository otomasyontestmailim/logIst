"use client";

import { useState } from "react";
import {
  LayoutDashboard,
  Truck,
  Container,
  Users,
  Package,
  FileText,
  ScrollText,
  Settings,
  BarChart2,
  Menu,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { SignOutButton } from "@/components/sign-out-button";

const navItems = [
  { href: "/dashboard", key: "dashboard", icon: LayoutDashboard },
  { href: "/drivers", key: "drivers", icon: Truck },
  { href: "/vehicles", key: "vehicles", icon: Container },
  { href: "/customers", key: "customers", icon: Users },
  { href: "/trips", key: "trips", icon: Package },
  { href: "/documents", key: "documents", icon: FileText },
  { href: "/reports", key: "reports", icon: BarChart2 },
  { href: "/audit", key: "audit", icon: ScrollText, adminOnly: true },
  { href: "/settings", key: "settings", icon: Settings },
] as const;

export function AppShell({
  appName,
  userLabel,
  role,
  headerSlot,
  children,
}: {
  appName: string;
  userLabel: string;
  role: "admin" | "dispatcher" | "driver" | null;
  headerSlot?: React.ReactNode;
  children: React.ReactNode;
}) {
  const t = useTranslations("Nav");
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const items = navItems.filter(
    (it) => !("adminOnly" in it) || role === "admin",
  );

  const navLinks = (onNavigate?: () => void) => (
    <nav className="flex flex-col gap-1 p-2">
      {items.map(({ href, key, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground",
            )}
          >
            <Icon className="size-4" />
            {t(key)}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="flex min-h-full flex-1">
      {/* Masaüstü sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex">
        <div className="flex h-14 items-center gap-2.5 border-b border-sidebar-border px-4">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Truck className="size-4" />
          </div>
          <span className="truncate font-semibold">{appName}</span>
        </div>
        {navLinks()}
      </aside>

      {/* Mobil drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-foreground/40"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          <aside className="absolute inset-y-0 left-0 flex w-64 max-w-[80%] flex-col border-r border-sidebar-border bg-sidebar shadow-floating">
            <div className="flex h-14 items-center justify-between border-b border-sidebar-border px-4">
              <div className="flex items-center gap-2.5">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Truck className="size-4" />
                </div>
                <span className="font-semibold">{appName}</span>
              </div>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label={t("closeMenu")}
                className="inline-flex size-8 items-center justify-center rounded-lg hover:bg-sidebar-accent"
              >
                <X className="size-4" />
              </button>
            </div>
            {navLinks(() => setMobileOpen(false))}
          </aside>
        </div>
      )}

      {/* Ana içerik */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between gap-4 border-b border-sidebar-border bg-sidebar px-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label={t("openMenu")}
              className="inline-flex size-9 items-center justify-center rounded-lg hover:bg-sidebar-accent md:hidden"
            >
              <Menu className="size-5" />
            </button>
            <span className="truncate text-sm text-muted-foreground">
              {userLabel}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {headerSlot}
            <ThemeToggle />
            <LocaleSwitcher />
            <SignOutButton />
          </div>
        </header>
        <div className="flex flex-1 flex-col">{children}</div>
      </div>
    </div>
  );
}
