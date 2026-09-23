import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import reactHooksPlugin from "eslint-plugin-react-hooks";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    plugins: { "react-hooks": reactHooksPlugin },
    rules: {
      // Downgraded: this codebase uses setState-in-effect deliberately for
      // client-only mount flags, matchMedia/localStorage reads, and
      // pathname-triggered UI resets — all legitimate external-system sync,
      // not accidental derived state.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Third-party agent-skill bundle, not application source.
    ".claude/**",
  ]),
]);

export default eslintConfig;
