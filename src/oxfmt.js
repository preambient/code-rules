import { defineConfig } from "oxfmt";

export default defineConfig({
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
  printWidth: 80,
  semi: true,
  singleQuote: false,
  sortPackageJson: false,
  trailingComma: "all",
});
