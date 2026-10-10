import { defineConfig } from "oxfmt";
import base from "./oxfmt.js";

export default defineConfig({
  ...base,
  ignorePatterns: [
    ...base.ignorePatterns,
    "backend/packages/db/.drizzle/",
    "**/typeset.css",
  ],
});
