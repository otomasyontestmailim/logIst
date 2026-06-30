"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";

export default function SignInPage() {
  const t = useTranslations("Auth");
  const tApp = useTranslations("App");
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handlePasswordSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (error) {
      // 400 = gerçekten yanlış e-posta/parola. 401/5xx = anon key veya sunucu
      // yapılandırma hatası (parola DEĞİL) → maskelemeden ayrı mesaj göster.
      if (error.status === 400) {
        toast.error(t("invalidCredentials"));
      } else {
        toast.error(t("serverError"));
      }
      return;
    }
    router.push("/dashboard");
  }

  async function handleMagicLink() {
    if (!email) {
      toast.error(t("genericError"));
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setLoading(false);
    if (error) {
      toast.error(t("genericError"));
      return;
    }
    toast.success(t("magicLinkSent"));
  }

  return (
    <main className="relative flex flex-1 flex-col items-center justify-center gap-8 bg-sidebar p-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      {/* Marka alanı */}
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Truck className="size-5" />
          </div>
          <span className="text-xl font-bold tracking-tight">
            {tApp("name")}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">{tApp("tagline")}</p>
      </div>

      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{t("signInTitle")}</CardTitle>
          <CardDescription>{t("signInSubtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordSignIn} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">{t("email")}</Label>
              <Input
                id="email"
                type="email"
                placeholder={t("emailPlaceholder")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">{t("password")}</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={loading}>
              {t("signInButton")}
            </Button>
          </form>

          <div className="my-4 text-center text-sm text-muted-foreground">
            {t("or")}
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={loading}
            onClick={handleMagicLink}
          >
            {t("magicLinkButton")}
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
