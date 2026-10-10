import { alphabeticalRules } from "./alphabetical.js";
import { fileURLToPath } from "node:url";
import { defineConfig } from "oxlint";

export default defineConfig({
  categories: { correctness: "error" },
  ignorePatterns: [
    "**/node_modules/**",
    "**/dist/**",
    "**/out/**",
    "**/.next/**",
    "**/.source/**",
    ".agents/**",
    ".claude/**",
    "**/storybook-static/**",
    "**/.drizzle/**",
  ],
  jsPlugins: [
    {
      name: "perfectionist",
      specifier: fileURLToPath(new URL("./perfectionist.js", import.meta.url)),
    },
  ],
  plugins: ["typescript", "import"],
  rules: alphabeticalRules,
});
