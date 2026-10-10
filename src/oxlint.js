import { defineConfig } from "oxlint";

export default defineConfig({
  plugins: ["typescript", "react", "import"],
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
});
