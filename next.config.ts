import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  // OCR SDK'sını sunucu bundle'ına gömme; çalışma anında require et.
  // (Yalnız lib/ocr içinde dinamik import edilir.)
  serverExternalPackages: ["@anthropic-ai/sdk"],
};

const withNextIntl = createNextIntlPlugin();

export default withNextIntl(nextConfig);
