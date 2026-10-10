import base from "./oxfmt.js";
import { defineConfig } from "oxfmt";

export default defineConfig({
  ...base,
  ignorePatterns: [
    ...base.ignorePatterns,
    "backend/packages/db/.drizzle/",
    "**/typeset.css",
  ],
});
