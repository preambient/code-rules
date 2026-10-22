import { jsxSortingRule } from "#src/alphabetical";
import base from "#src/oxlint";
import { defineConfig } from "oxlint";

export default defineConfig({
  ...base,
  plugins: [...base.plugins, "react", "jsx-a11y"],
  rules: { ...base.rules, "perfectionist/sort-jsx-props": jsxSortingRule },
});
