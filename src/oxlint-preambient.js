import { createRequire } from "node:module";
import { defineConfig } from "oxlint";
import base from "./oxlint.js";

const require = createRequire(import.meta.url);

export default defineConfig({
  ...base,
  jsPlugins: [require.resolve("@shadcn/lint")],
  settings: {
    shadcn: {
      ui: "@repo/ui/components",
      componentImports: ["^@repo/ui(/|$)"],
      note: "Use component variants and sizes. Component appearance belongs in frontend/packages/ui; only placement/layout may change at call sites.",
    },
  },
  rules: {
    "shadcn/no-restyle": ["error", { allow: ["layout"] }],
    "shadcn/no-arbitrary-values": "error",
    "shadcn/no-raw-colors": "error",
    "shadcn/require-static-classes": "error",
  },
  overrides: [
    {
      files: ["frontend/packages/ui/src/components/**"],
      rules: {
        "shadcn/no-restyle": "off",
        "shadcn/no-arbitrary-values": "off",
      },
    },
    { files: ["backend/**"], rules: { "no-console": "error" } },
  ],
});
