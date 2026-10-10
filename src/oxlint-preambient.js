import backend from "./oxlint-backend.js";
import frontend from "./oxlint-frontend.js";
import base from "./oxlint.js";
import { createRequire } from "node:module";
import { defineConfig } from "oxlint";

const require = createRequire(import.meta.url);

export default defineConfig({
  ...base,
  jsPlugins: [...base.jsPlugins, require.resolve("@shadcn/lint")],
  overrides: [
    {
      files: ["frontend/**", "internal/apps/**"],
      plugins: frontend.plugins,
      rules: {
        ...frontend.rules,
        "shadcn/no-arbitrary-values": "error",
        "shadcn/no-raw-colors": "error",
        "shadcn/no-restyle": ["error", { allow: ["layout"] }],
        "shadcn/require-static-classes": "error",
      },
    },
    {
      files: ["frontend/packages/ui/src/components/**"],
      rules: {
        "shadcn/no-arbitrary-values": "off",
        "shadcn/no-restyle": "off",
      },
    },
    { files: ["backend/**"], plugins: backend.plugins, rules: backend.rules },
  ],
  settings: {
    shadcn: {
      componentImports: ["^@repo/ui(/|$)"],
      note: "Use component variants and sizes. Component appearance belongs in frontend/packages/ui; only placement/layout may change at call sites.",
      ui: "@repo/ui/components",
    },
  },
});
