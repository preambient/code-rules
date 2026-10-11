import backend from "@preambient/code-rules/backend";
import base from "@preambient/code-rules/base";
import frontend from "@preambient/code-rules/frontend";
import preambient from "@preambient/code-rules/oxlint/preambient";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";

const require = createRequire(import.meta.url);
const binary = join(
  dirname(require.resolve("oxlint/package.json")),
  "bin/oxlint",
);

/** Run the native import restriction against an isolated TypeScript fixture.
 * @param t - Test context that registers fixture cleanup.
 * @returns Helper that writes source and reports the native import diagnostics.
 */
function importFixture(t) {
  const directory = mkdtempSync(join(tmpdir(), "preambient-imports-"));
  t.after(
    /** Remove the temporary fixture directory after the test.
     * @returns Completion of the synchronous directory removal.
     */
    () => rmSync(directory, { force: true, recursive: true }),
  );
  const config = join(directory, ".oxlintrc.json");
  const source = join(directory, "example.ts");
  writeFileSync(
    config,
    JSON.stringify({
      rules: { "no-restricted-imports": base.rules["no-restricted-imports"] },
    }),
  );
  return (
    /** Write the import fixture and run native Oxlint with the isolated import restriction.
     * @param code - TypeScript source containing imports to check.
     * @returns Child process status and captured import diagnostics.
     */ (code) => {
      writeFileSync(source, code);
      return spawnSync(
        process.execPath,
        [binary, "--format", "default", "--config", config, source],
        { cwd: directory, encoding: "utf8" },
      );
    }
  );
}

test(
  "every runtime preset inherits the same-directory import policy",
  /** Verify that every runtime preset inherits the same-directory import policy. */ () => {
    const rule = base.rules["no-restricted-imports"];
    assert.equal(rule[0], "error");
    for (const preset of [backend, frontend, preambient]) {
      assert.deepEqual(preset.rules["no-restricted-imports"], rule);
    }
    for (const override of preambient.overrides) {
      if (override.rules["no-restricted-imports"]) {
        assert.deepEqual(override.rules["no-restricted-imports"], rule);
      }
    }
  },
);

test(
  "same-directory files, aliases, and package exports remain allowed",
  /** Verify that same-directory files, aliases, and package exports remain allowed.
   * @param t - Test context that owns fixture cleanup and subtests.
   */ (t) => {
    const lint = importFixture(t);
    for (const path of [
      "./queries",
      "./queries.js",
      "@repo/zero/queries",
      "@/queries",
      "#queries",
      "node:fs",
    ]) {
      const result = lint(`export * from "${path}";`);
      assert.equal(result.status, 0, result.stdout + result.stderr);
    }
  },
);

test(
  "parent and child directory imports fail with an actionable message",
  /** Verify that parent and child directory imports fail with an actionable message.
   * @param t - Test context that owns fixture cleanup and subtests.
   */ (t) => {
    const lint = importFixture(t);
    for (const path of [
      "../queries",
      "../../src/queries",
      "./src/queries",
      "./src/deeper/queries",
      "./../queries",
      "..",
      "./",
    ]) {
      const result = lint(`import "${path}";`);
      assert.equal(result.status, 1, result.stdout + result.stderr);
      assert.match(result.stdout + result.stderr, /no-restricted-imports/);
      assert.match(result.stdout + result.stderr, /package export or an alias/);
    }
  },
);

test(
  "type imports, re-exports, and literal dynamic imports cannot bypass the policy",
  /** Verify that type imports, re-exports, and literal dynamic imports cannot bypass the policy.
   * @param t - Test context that owns fixture cleanup and subtests.
   */ (t) => {
    const lint = importFixture(t);
    for (const source of [
      'import type { Query } from "../queries"; export type Value = Query;',
      'export type { Query } from "../queries";',
      'export { queries } from "./src/queries";',
      'export * from "../../src/queries";',
      'export const load = () => import("../queries");',
      'export const load = () => import("./src/queries");',
    ]) {
      const result = lint(source);
      assert.equal(result.status, 1, result.stdout + result.stderr);
      assert.match(result.stdout + result.stderr, /no-restricted-imports/);
    }
  },
);

test(
  "every runtime preset inherits the full JSDoc contract",
  /** Verify that frontend and backend presets preserve shared documentation enforcement. */
  () => {
    for (const preset of [backend, frontend, preambient]) {
      for (const [name, rule] of Object.entries(base.rules)) {
        if (name.startsWith("jsdoc-js/")) {
          assert.deepEqual(preset.rules[name], rule, name);
        }
      }
      assert.deepEqual(preset.settings.jsdoc, base.settings.jsdoc);
    }
  },
);
