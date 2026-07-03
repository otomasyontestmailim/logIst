import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth";
import { SignOutButton } from "@/components/sign-out-button";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { Shield } from "lucide-react";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const user = await getCurrentUser();

  if (!user) {
    redirect({ href: "/sign-in", locale });
  }
  if (!user!.is_superadmin) {
    redirect({ href: "/dashboard", locale });
  }

  const t = await getTranslations("Admin");

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="sticky top-0 z-50 flex h-14 items-center justify-between border-b border-sidebar-border bg-sidebar px-4 md:px-6">
        <div className="flex items-center gap-2">
          <Shield className="size-5 text-primary" />
          <span className="font-semibold">{t("title")}</span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <LocaleSwitcher />
          <SignOutButton />
        </div>
      </header>
      <main className="flex-1 p-4 md:p-6">{children}</main>
    </div>
  );
}
