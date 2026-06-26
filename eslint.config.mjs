import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import noUncheckedSupabaseWrite from "./eslint-rules/no-unchecked-supabase-write.mjs";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    ".claude/worktrees/**",
  ]),
  // Local rules. Enforce the checked-write convention on application source so
  // a discarded Supabase write (the recurring FOLLOW_UPS bug class) can't ship
  // again. Tests construct mock builders, so they're out of scope.
  {
    files: ["src/**/*.{ts,tsx}"],
    plugins: { local: { rules: { "no-unchecked-supabase-write": noUncheckedSupabaseWrite } } },
    rules: { "local/no-unchecked-supabase-write": "error" },
  },
]);

export default eslintConfig;
