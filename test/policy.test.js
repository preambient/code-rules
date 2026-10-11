import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const packageRoot =
  process.env.CODE_RULES_PACKAGE_ROOT ??
  resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** Create a consumer outside this repository to expose package resolution bugs. */
function consumer(t) {
  const directory = mkdtempSync(join(tmpdir(), "preambient-policy-"));
  t.after(() => rmSync(directory, { force: true, recursive: true }));
  mkdirSync(join(directory, "node_modules/@preambient"), { recursive: true });
  symlinkSync(
    packageRoot,
    join(directory, "node_modules/@preambient/code-rules"),
    "dir",
  );
  const run = (...args) =>
    spawnSync(process.execPath, [join(packageRoot, "src/cli.js"), ...args], {
      cwd: directory,
      encoding: "utf8",
    });
  const write = (file, text) => {
    mkdirSync(dirname(join(directory, file)), { recursive: true });
    writeFileSync(join(directory, file), text);
  };
  const initialized = run("init");
  assert.equal(initialized.status, 0, initialized.stderr);
  return { directory, run, write };
}

test("format fixes ordinary strings and preserves interpolation", (t) => {
  const fixture = consumer(t);
  fixture.write(
    "example.ts",
    "export const greeting='hello'\nexport const message=`Hello ${greeting}`\n",
  );
  assert.notEqual(fixture.run("format:check").status, 0);
  const formatted = fixture.run("format");
  assert.equal(formatted.status, 0, formatted.stderr);
  assert.equal(
    readFileSync(join(fixture.directory, "example.ts"), "utf8"),
    'export const greeting = "hello";\nexport const message = `Hello ${greeting}`;\n',
  );
  assert.equal(fixture.run("check").status, 0);
});

test("backend console rule remains active even with a nested override", (t) => {
  const fixture = consumer(t);
  fixture.write("backend/example.ts", 'console.log("example");\n');
  fixture.write("backend/.oxlintrc.json", '{"rules":{"no-console":"off"}}\n');
  const result = fixture.run("lint");
  assert.notEqual(result.status, 0);
  assert.match(result.stdout + result.stderr, /no-console/);
});

test("component appearance is rejected at call sites and allowed in the UI package", (t) => {
  const fixture = consumer(t);
  const source =
    'import { Button } from "@repo/ui/components/button";\nexport function Example() { return <Button className="rounded-full">Save</Button>; }\n';
  fixture.write("frontend/example.tsx", source);
  const rejected = fixture.run("lint");
  assert.notEqual(rejected.status, 0);
  assert.match(rejected.stdout + rejected.stderr, /no-restyle/);
  rmSync(join(fixture.directory, "frontend/example.tsx"));
  fixture.write("frontend/packages/ui/src/components/example.tsx", source);
  const accepted = fixture.run("lint");
  assert.equal(accepted.status, 0, accepted.stdout + accepted.stderr);
});

test("formatter exclusions are relative to the consumer root", (t) => {
  const fixture = consumer(t);
  fixture.write(
    "backend/packages/db/.drizzle/generated.ts",
    "invalid ~~~ code",
  );
  fixture.write("frontend/typeset.css", "invalid {{{");
  const result = fixture.run("format:check");
  assert.equal(result.status, 0, result.stdout + result.stderr);
});

test("generated Next.js declarations are excluded but handwritten imports are checked", (t) => {
  const fixture = consumer(t);
  const source = 'import "./.next/types/routes.d.ts";\n';
  fixture.write("frontend/apps/dashboard/next-env.d.ts", source);
  const accepted = fixture.run("lint");
  assert.equal(accepted.status, 0, accepted.stdout + accepted.stderr);
  fixture.write("frontend/apps/dashboard/handwritten.ts", source);
  const rejected = fixture.run("lint");
  assert.notEqual(rejected.status, 0);
  assert.match(rejected.stdout + rejected.stderr, /no-restricted-imports/);
});

test("edited wrappers and alternate root configs fail verification", (t) => {
  const fixture = consumer(t);
  fixture.write("oxlint.config.mts", "export default {};\n");
  assert.notEqual(fixture.run("verify").status, 0);
  fixture.write(
    "oxlint.config.mts",
    'export { default } from "@preambient/code-rules/oxlint/preambient";\n',
  );
  fixture.write(".oxfmtrc.json", "{}\n");
  assert.notEqual(fixture.run("verify").status, 0);
});

test("init preserves existing files and the CLI rejects override flags", (t) => {
  const fixture = consumer(t);
  fixture.write("oxfmt.config.mts", "// existing settings\n");
  assert.notEqual(fixture.run("init").status, 0);
  assert.equal(
    readFileSync(join(fixture.directory, "oxfmt.config.mts"), "utf8"),
    "// existing settings\n",
  );
  assert.notEqual(fixture.run("lint", "--allow", "no-console").status, 0);
});

test("alphabetical policy covers every Perfectionist structure through Oxlint", async (t) => {
  const cases = {
    "sort-array-includes": 'export const value = ["z", "a"].includes("a");',
    "sort-arrays": 'export const SORTED_VALUES = ["z", "a"];',
    "sort-classes":
      "export class Example { zebra() { return 1; } alpha() { return 2; } }",
    "sort-decorators":
      "declare const alpha: any, zebra: any; @zebra @alpha export class Example {}",
    "sort-enums": 'export enum Example { Zebra = "z", Alpha = "a" }',
    "sort-export-attributes":
      'export { value } from "example" with { zebra: "z", alpha: "a" };',
    "sort-exports": 'export * from "z"; export * from "a";',
    "sort-heritage-clauses":
      "interface Alpha { a: string } interface Zebra { z: string } export interface Value extends Zebra, Alpha { value: string }",
    "sort-import-attributes":
      'import value from "example" with { zebra: "z", alpha: "a" }; export { value };',
    "sort-imports":
      'import zebra from "z"; import alpha from "a"; export { alpha, zebra };',
    "sort-interfaces":
      "export interface Value { zebra: string; alpha: string; }",
    "sort-intersection-types":
      "type Alpha = { a: string }; type Zebra = { z: string }; export type Value = Zebra & Alpha;",
    "sort-jsx-props":
      'export function Example() { return <div title="z" id="a" />; }',
    "sort-maps": 'export const value = new Map([["z", 1], ["a", 2]]);',
    "sort-modules":
      "export function zebra() { return 1; } export function alpha() { return 2; }",
    "sort-named-exports":
      "const alpha = 1; const zebra = 2; export { zebra, alpha };",
    "sort-object-types":
      "export type Value = { zebra: string; alpha: string };",
    "sort-objects": "export const value = { zebra: 1, alpha: 2 };",
    "sort-sets": 'export const value = new Set(["z", "a"]);',
    "sort-switch-case":
      'export function value(key: string) { switch(key) { case "z": return 1; case "a": return 2; default: return 0; } }',
    "sort-union-types": 'export type Value = "z" | "a";',
    "sort-variable-declarations": "export const zebra = 1, alpha = 2;",
  };
  for (const [rule, source] of Object.entries(cases)) {
    await t.test(rule, (t) => {
      const fixture = consumer(t);
      fixture.write("frontend/example.tsx", source);
      const result = fixture.run("lint");
      assert.notEqual(result.status, 0);
      assert.ok(
        (result.stdout + result.stderr).includes(rule),
        result.stdout + result.stderr,
      );
    });
  }
  await t.test("named imports use native Oxlint", (t) => {
    const fixture = consumer(t);
    fixture.write(
      "frontend/example.ts",
      'import { zebra, alpha } from "example"; export { alpha, zebra };',
    );
    const result = fixture.run("lint");
    assert.match(result.stdout + result.stderr, /sort-imports/);
    assert.doesNotMatch(
      result.stdout + result.stderr,
      /perfectionist\(sort-named-imports\)/,
    );
  });
});

test("safe fixes preserve runtime evaluation, collection, and positional array order", (t) => {
  const fixture = consumer(t);
  const source =
    'declare function record(value: string): number;\nexport const object = { zebra: record("z"), alpha: record("a") };\nexport const set = new Set(["z", "a"]);\nexport const positional = ["z", "a"];\n';
  fixture.write("example.ts", source);
  const result = fixture.run("lint:fix");
  assert.notEqual(result.status, 0);
  assert.equal(
    readFileSync(join(fixture.directory, "example.ts"), "utf8"),
    source,
  );
  assert.doesNotMatch(result.stdout + result.stderr, /sort-arrays/);
});

test("safe import fixes preserve side-effect import barriers", (t) => {
  const fixture = consumer(t);
  const source =
    'import "z-side-effect";\nimport "a-side-effect";\nexport const value = 1;\n';
  fixture.write("example.ts", source);
  const result = fixture.run("lint:fix");
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.equal(
    readFileSync(join(fixture.directory, "example.ts"), "utf8"),
    source,
  );
});

test("frontend JSX rules do not leak into backend files", (t) => {
  const fixture = consumer(t);
  const source =
    'export function Example() { return <div title="z" id="a" />; }';
  fixture.write("backend/example.tsx", source);
  const result = fixture.run("lint");
  assert.doesNotMatch(
    result.stdout + result.stderr,
    /sort-jsx-props|jsx-a11y|react\(/,
  );
});

test("mixed imports, re-exports, and callable intersections require review", (t) => {
  const fixture = consumer(t);
  const source =
    'import { zebra } from "./zebra";\nimport "./initialize";\nimport { alpha } from "./alpha";\nexport { alpha, zebra };\nexport * from "./zebra";\nexport * from "./alpha";\ntype Zebra = (value: string) => "zebra";\ntype Alpha = (value: string) => "alpha";\nexport type Fn = Zebra & Alpha;\n';
  fixture.write("example.ts", source);
  const result = fixture.run("lint:fix");
  assert.notEqual(result.status, 0);
  assert.equal(
    readFileSync(join(fixture.directory, "example.ts"), "utf8"),
    source,
  );
  for (const rule of [
    "sort-imports",
    "sort-exports",
    "sort-intersection-types",
  ]) {
    assert.ok((result.stdout + result.stderr).includes(rule));
  }
});
