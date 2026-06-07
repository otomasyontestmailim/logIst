"use client";

import { LayoutDashboard, Truck, Users, Package, FileText } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { SignOutButton } from "@/components/sign-out-button";

const navItems = [
  { href: "/dashboard", key: "dashboard", icon: LayoutDashboard },
  { href: "/drivers", key: "drivers", icon: Truck },
  { href: "/customers", key: "customers", icon: Users },
  { href: "/trips", key: "trips", icon: Package },
  { href: "/documents", key: "documents", icon: FileText },
] as const;

export function AppShell({
  appName,
  userLabel,
  children,
}: {
  appName: string;
  userLabel: string;
  children: React.ReactNode;
}) {
  const t = useTranslations("Nav");
  const pathname = usePathname();

  return (
    <div className="flex min-h-full flex-1">
      {/* Sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r bg-muted/30 md:flex">
        <div className="flex h-14 items-center border-b px-4 font-semibold">
          {appName}
        </div>
        <nav className="flex flex-col gap-1 p-2">
          {navItems.map(({ href, key, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="size-4" />
                {t(key)}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between gap-4 border-b px-4">
          <span className="truncate text-sm text-muted-foreground">
            {userLabel}
          </span>
          <div className="flex items-center gap-2">
            <LocaleSwitcher />
            <SignOutButton />
          </div>
        </header>
        <div className="flex flex-1 flex-col">{children}</div>
      </div>
    </div>
  );
}
