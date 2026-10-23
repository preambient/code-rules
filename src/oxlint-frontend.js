import { jsxSortingRule } from "#src/alphabetical";
import base from "#src/oxlint";
import { componentRules } from "#src/react-components";
import { fileURLToPath } from "node:url";
import { defineConfig } from "oxlint";

export default defineConfig({
  ...base,
  jsPlugins: [
    ...base.jsPlugins,
    {
      name: "react-components",
      specifier: fileURLToPath(
        new URL("./react-components.js", import.meta.url),
      ),
    },
  ],
  plugins: [...base.plugins, "react", "jsx-a11y"],
  rules: {
    ...base.rules,
    ...componentRules,
    "perfectionist/sort-jsx-props": jsxSortingRule,
  },
});
