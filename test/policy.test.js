import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const packageRoot =
  process.env.CODE_RULES_PACKAGE_ROOT ??
  resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** Create a consumer outside this repository to expose package resolution bugs. */
function consumer(t) {
  const directory = mkdtempSync(join(tmpdir(), "preambient-policy-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
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
