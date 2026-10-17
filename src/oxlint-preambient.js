import backend from "./oxlint-backend.js";
import frontend from "./oxlint-frontend.js";
import base from "./oxlint.js";
import { documentFiles, primitiveFiles } from "./ui-policy.js";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { defineConfig } from "oxlint";

const require = createRequire(import.meta.url);

export default defineConfig({
  ...base,
  jsPlugins: [
    ...base.jsPlugins,
    require.resolve("@shadcn/lint"),
    {
      name: "ui-policy",
      specifier: fileURLToPath(new URL("./ui-policy.js", import.meta.url)),
    },
    {
      name: "preambient",
      specifier: fileURLToPath(new URL("./filenames.js", import.meta.url)),
    },
  ],
  overrides: [
    {
      files: ["frontend/**", "internal/apps/**"],
      plugins: frontend.plugins,
      rules: {
        ...frontend.rules,
        "shadcn/no-arbitrary-values": "error",
        "shadcn/no-inline-styles": "error",
        "shadcn/no-raw-colors": "error",
        "shadcn/no-restyle": ["error", { allow: ["layout"] }],
        "shadcn/require-static-classes": "error",
        "ui-policy/ui-contracts": "error",
      },
    },
    {
      files: primitiveFiles,
      rules: {
        "shadcn/no-arbitrary-values": "off",
        "shadcn/no-inline-styles": "off",
        "shadcn/no-restyle": "off",
        "ui-policy/ui-contracts": "off",
      },
    },
    {
      files: documentFiles,
      rules: {
        "shadcn/no-inline-styles": "off",
        "ui-policy/ui-contracts": "off",
      },
    },
    { files: ["backend/**"], plugins: backend.plugins, rules: backend.rules },
  ],
  rules: { ...base.rules, "preambient/resource-event-modules": "error" },
  settings: {
    ...base.settings,
    shadcn: {
      componentImports: ["^@repo/ui(/|$)"],
      note: "Use component variants and sizes. Component appearance belongs in frontend/packages/ui; only placement/layout may change at call sites.",
      ui: "@repo/ui/components",
    },
  },
});
