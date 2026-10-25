import base from "#src/oxfmt";
import { defineConfig } from "oxfmt";

export default defineConfig({
  ...base,
  ignorePatterns: [...base.ignorePatterns, "**/typeset.css"],
});
