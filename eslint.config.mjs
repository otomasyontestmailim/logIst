import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Ölçülü ek kurallar — model fark etmeksizin tutarlı kod (bkz. CONVENTIONS.md).
  {
    rules: {
      // `import type { X }` tutarlılığı (kod tabanı zaten bu deseni kullanıyor)
      "@typescript-eslint/consistent-type-imports": [
        "warn",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      // Kullanılmayan değişkenler hata; _ ön ekli olanlar muaf
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      // any kullanımı uyarı (kasıtlıysa eslint-disable ile)
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
  // Prettier ile çakışan biçim kurallarını kapat (en sonda olmalı).
  prettier,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Impeccable design skill bundle (vendored scripts; not project source).
    ".claude/**",
    // Expo mobil uygulama — kendi ESLint/TS yapılandırması var (apps/mobile).
    "apps/**",
  ]),
]);

export default eslintConfig;
