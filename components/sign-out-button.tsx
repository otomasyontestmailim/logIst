"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  const t = useTranslations("Auth");
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/sign-in");
  }

  return (
    <Button variant="outline" size="sm" onClick={handleSignOut}>
      {t("signOut")}
    </Button>
  );
}
