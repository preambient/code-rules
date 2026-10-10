import { jsxSortingRule } from "./alphabetical.js";
import base from "./oxlint.js";
import { defineConfig } from "oxlint";

export default defineConfig({
  ...base,
  plugins: [...base.plugins, "react", "jsx-a11y"],
  rules: { ...base.rules, "perfectionist/sort-jsx-props": jsxSortingRule },
});
