import base from "./oxlint.js";
import { defineConfig } from "oxlint";

export default defineConfig({
  ...base,
  plugins: [...base.plugins, "node"],
  rules: { ...base.rules, "no-console": "error" },
});
