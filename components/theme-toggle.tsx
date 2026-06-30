"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const t = useTranslations("Theme");
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  // Sunucu render'ı tema bilmez (hydration mismatch'i önlemek için boş tut).
  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon-xs"
        disabled
        aria-hidden
        className="opacity-0"
      >
        <Sun className="size-3.5" />
      </Button>
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? t("switchToLight") : t("switchToDark")}
    >
      {isDark ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
    </Button>
  );
}
