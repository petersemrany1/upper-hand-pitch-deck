import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "dist",
      ".output",
      ".vinxi",
      ".wrangler",
      "node_modules",
      "src/routeTree.gen.ts",
    ],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
      // Legacy debt: burned down incrementally as files are rewritten.
      // New code should not add `any` — reviewers treat new warnings as failures.
      "@typescript-eslint/no-explicit-any": "warn",
      "no-empty": ["error", { allowEmptyCatch: true }],
    },
  },

  // Supabase Edge Functions run on Deno, not the browser.
  {
    files: ["supabase/functions/**/*.ts"],
    languageOptions: {
      globals: {
        Deno: "readonly",
        ...globals.worker,
      },
    },
    rules: {
      "react-refresh/only-export-components": "off",
    },
  },

  // Server-side TanStack Start code runs on Node/workerd.
  {
    files: ["src/**/*.functions.ts", "src/services/**/*.ts", "src/**/*.server.ts"],
    languageOptions: {
      globals: { ...globals.node },
    },
  },

  // ---------------------------------------------------------------------------
  // Import boundaries (architecture rules — see ARCHITECTURE.md)
  // ---------------------------------------------------------------------------

  // UI layers must not talk to Supabase directly; go through src/data hooks
  // and repositories. "warn" until the Phase 2 data-layer migration completes,
  // then this flips to "error".
  {
    files: ["src/components/**/*.{ts,tsx}", "src/routes/**/*.{ts,tsx}"],
    ignores: ["src/components/ui/**"],
    rules: {
      "no-restricted-imports": [
        "warn",
        {
          paths: [
            {
              name: "@/integrations/supabase/client",
              message:
                "UI must not query Supabase directly. Use a hook from src/data (React Query) or a repository instead.",
            },
          ],
        },
      ],
    },
  },

  // Shared low-level layers must never depend on UI.
  {
    files: ["src/lib/**/*.{ts,tsx}", "src/utils/**/*.{ts,tsx}", "src/services/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/components/*", "@/routes/*", "**/routes/*"],
              message:
                "lib/utils/services are foundation layers and must not import UI code.",
            },
          ],
        },
      ],
    },
  },
);
