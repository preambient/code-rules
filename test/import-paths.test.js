import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const packageRoot =
  process.env.CODE_RULES_PACKAGE_ROOT ??
  resolve(dirname(fileURLToPath(import.meta.url)), "..");

const require = createRequire(join(packageRoot, "package.json"));

const backend = (
  await import(require.resolve("@preambient/code-rules/backend"))
).default;

const base = (await import(require.resolve("@preambient/code-rules/base")))
  .default;

const frontend = (
  await import(require.resolve("@preambient/code-rules/frontend"))
).default;

const preambient = (
  await import(require.resolve("@preambient/code-rules/oxlint/preambient"))
).default;

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

  t.after(() => rmSync(directory, { force: true, recursive: true }));

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

test("every runtime preset inherits the local import policies", () => {
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
});

test("extensionless local imports, dependency entry points, and assets remain allowed", (t) => {
  const lint = importFixture(t);

  for (const path of [
    "./queries",
    "./organization.events",
    "./styles.css",
    "./catalog.json",
    "./icon.svg",
    "./icon.svg?module=icon.js",
    "./icon.svg#icon.js",
    "./queries?source=queries.js",
    "@repo/zero/queries",
    "@/queries",
    "@/styles.css",
    "#queries",
    "#src/queries",
    "#src/catalog.json",
    "#src/styles.css?source=theme.ts",
    "~/queries",
    "pino/browser.js",
    "@vendor/package/dist/runtime.mjs",
    "vendor/package.cjs",
    "node:fs",
  ]) {
    const result = lint(`export * from "${path}";`);

    assert.equal(result.status, 0, result.stdout + result.stderr);
  }
});

test("local code imports reject every JavaScript and TypeScript extension", (t) => {
  const lint = importFixture(t);

  for (const prefix of ["./", "../", "#", "#src/", "@/", "~/", "/src/"]) {
    for (const extension of [
      "js",
      "jsx",
      "mjs",
      "cjs",
      "ts",
      "tsx",
      "mts",
      "cts",
      "d.ts",
    ]) {
      const path = `${prefix}queries.${extension}`;

      const result = lint(`import "${path}";`);

      assert.equal(
        result.status,
        1,
        `${path}\n${result.stdout}${result.stderr}`,
      );
      assert.match(
        result.stdout + result.stderr,
        /Local JavaScript and TypeScript imports must be extensionless/,
      );
    }
  }
});

test("type imports, re-exports, and literal dynamic imports cannot bypass extension checks", (t) => {
  const lint = importFixture(t);

  for (const source of [
    'import { query } from "./queries.js"; export { query };',
    'import type { Query } from "#src/queries.ts"; export type Value = Query;',
    'export type { Query } from "@/queries.d.ts";',
    'export type * from "#src/queries.ts";',
    'export { query } from "./queries.mjs";',
    'export * from "./queries.js";',
    'export const load = () => import("~/queries.ts");',
    'import "./queries.js?raw";',
    'import "./queries.js#named";',
  ]) {
    const result = lint(source);

    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.match(
      result.stdout + result.stderr,
      /Local JavaScript and TypeScript imports must be extensionless/,
    );
  }
});

test("dependency entry points remain allowed in static and dynamic imports and re-exports", (t) => {
  const lint = importFixture(t);

  for (const source of [
    'import pino from "pino/browser.js"; export { pino };',
    'export * from "@vendor/package/runtime.js";',
    'export type { Options } from "@vendor/package/types.d.ts";',
    'export const load = () => import("pino/browser.js");',
    'import "vendor/register.cjs";',
  ]) {
    const result = lint(source);

    assert.equal(result.status, 0, result.stdout + result.stderr);
  }
});

test("parent and child directory imports fail with an actionable message", (t) => {
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
});

test("type imports, re-exports, and literal dynamic imports cannot bypass the policy", (t) => {
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
});

test("every runtime preset inherits the full JSDoc contract", () => {
  for (const preset of [backend, frontend, preambient]) {
    for (const [name, rule] of Object.entries(base.rules)) {
      if (name.startsWith("jsdoc-js/")) {
        assert.deepEqual(preset.rules[name], rule, name);
      }
    }
    assert.deepEqual(preset.settings.jsdoc, base.settings.jsdoc);
  }
});

test("every runtime preset inherits declaration and JSDoc spacing", () => {
  for (const preset of [backend, frontend, preambient]) {
    for (const name of [
      "stylistic/lines-around-comment",
      "stylistic/padding-line-between-statements",
    ])
      assert.deepEqual(preset.rules[name], base.rules[name]);
    assert.ok(preset.jsPlugins.some((plugin) => plugin.name === "stylistic"));
  }
});
