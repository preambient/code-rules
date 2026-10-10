import { defineConfig } from "oxfmt";

export default defineConfig({
  semi: true,
  singleQuote: false,
  trailingComma: "all",
  printWidth: 80,
  sortPackageJson: false,
  ignorePatterns: [
    "bun.lock",
    "skills-lock.json",
    ".agents/",
    ".claude/",
    "node_modules/",
    ".next/",
    ".source/",
    ".turbo/",
    "out/",
    "dist/",
    "next-env.d.ts",
    "storybook-static/",
  ],
});
