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

/** Create a consumer outside this repository to expose package resolution bugs.
 * @param t - Test context that registers temporary consumer cleanup.
 * @returns Fixture directory and helpers for writing files and running the package CLI.
 */
function consumer(t) {
  const directory = mkdtempSync(join(tmpdir(), "preambient-policy-"));

  t.after(() => rmSync(directory, { force: true, recursive: true }));
  mkdirSync(join(directory, "node_modules/@preambient"), { recursive: true });
  symlinkSync(
    packageRoot,
    join(directory, "node_modules/@preambient/code-rules"),
    "dir",
  );

  /** Run the installed policy command inside the isolated consumer and capture its output.
   * @param args - CLI command and arguments to execute in the consumer.
   * @returns Child process status and captured output.
   */
  const run = (...args) =>
    spawnSync(process.execPath, [join(packageRoot, "src/cli.js"), ...args], {
      cwd: directory,
      encoding: "utf8",
    });

  /** Create the fixture parent directories and write the supplied source.
   * @param file - Consumer-relative destination for the fixture.
   * @param text - Source content to write at that destination.
   */
  const write = (file, text) => {
    mkdirSync(dirname(join(directory, file)), { recursive: true });
    writeFileSync(join(directory, file), text);
  };

  const initialized = run("init");

  assert.equal(initialized.status, 0, initialized.stderr);
  return { directory, run, write };
}

test("declaration spacing is enforced in frontend, backend, and shared code", (t) => {
  const fixture = consumer(t);

  const source = `import "alpha";
import "beta";
const alpha = 1;
const beta = () => alpha;
function gamma() { return beta(); }
gamma();
`;

  for (const file of [
    "frontend/example.ts",
    "backend/example.ts",
    "shared/example.ts",
  ]) {
    fixture.write(file, source);
  }

  const rejected = fixture.run("lint");

  assert.notEqual(rejected.status, 0);
  assert.match(
    rejected.stdout + rejected.stderr,
    /padding-line-between-statements/,
  );

  const fixed = fixture.run("lint:fix");

  assert.equal(fixed.status, 0, fixed.stdout + fixed.stderr);
  for (const file of [
    "frontend/example.ts",
    "backend/example.ts",
    "shared/example.ts",
  ]) {
    assert.equal(
      readFileSync(join(fixture.directory, file), "utf8"),
      source
        .replace('import "beta";\n', 'import "beta";\n\n')
        .replace("const alpha = 1;\n", "const alpha = 1;\n\n")
        .replace("const beta = () => alpha;\n", "const beta = () => alpha;\n\n")
        .replace(
          "function gamma() { return beta(); }\n",
          "function gamma() { return beta(); }\n\n",
        ),
    );
  }
});

test("spacing fixes preserve comments, exports, nested declarations, and Oxfmt stability", (t) => {
  const fixture = consumer(t);

  const source = `import "alpha";
import "beta";
export const alpha = 1; // Keep this trailing comment.
/** Return a value adjusted by the supplied offset.
 * @param offset - Amount added to the base value.
 * @returns The adjusted value.
 */
export const beta = (offset: number) => {
  const base = alpha;
  const result = base + offset;
  return result;
};
/** Return the default value.
 * @returns The numeric default.
 */
export default function gamma() { return beta(1); }
`;

  fixture.write("example.ts", source);

  const fixed = fixture.run("lint:fix");

  assert.equal(fixed.status, 0, fixed.stdout + fixed.stderr);

  const output = readFileSync(join(fixture.directory, "example.ts"), "utf8");

  assert.equal(
    output,
    source
      .replace('import "beta";\n', 'import "beta";\n\n')
      .replace("comment.\n", "comment.\n\n")
      .replace("const base = alpha;\n", "const base = alpha;\n\n")
      .replace(
        "const result = base + offset;\n",
        "const result = base + offset;\n\n",
      )
      .replace("};\n/**", "};\n\n/**"),
  );

  const formatted = fixture.run("format");

  assert.equal(formatted.status, 0, formatted.stderr);

  const snapshot = readFileSync(join(fixture.directory, "example.ts"), "utf8");

  const checked = fixture.run("check");

  assert.equal(checked.status, 0, checked.stdout + checked.stderr);
  assert.equal(fixture.run("lint:fix").status, 0);
  assert.equal(fixture.run("format").status, 0);
  assert.equal(
    readFileSync(join(fixture.directory, "example.ts"), "utf8"),
    snapshot,
  );
});

test("let, var, destructuring, and function expressions receive declaration spacing", (t) => {
  const fixture = consumer(t);

  fixture.write(
    "example.ts",
    `let alpha = 1;
var beta = 2;
const { gamma } = { gamma: 3 };
const delta = function () { return alpha + beta + gamma; };
alpha = delta();
beta = alpha;
`,
  );
  assert.notEqual(fixture.run("lint").status, 0);

  const fixed = fixture.run("lint:fix");

  assert.equal(fixed.status, 0, fixed.stdout + fixed.stderr);
  assert.equal(
    readFileSync(join(fixture.directory, "example.ts"), "utf8"),
    `let alpha = 1;

var beta = 2;

const { gamma } = { gamma: 3 };

const delta = function () { return alpha + beta + gamma; };

alpha = delta();
beta = alpha;
`,
  );
});

test("loop headers, callbacks, properties, and overload signatures stay compact", (t) => {
  const fixture = consumer(t);

  const source = `/** Return the supplied value without changing it.
 * @param value - Value to return.
 * @returns The original value.
 */
export function beta(value: number): number;
export function beta(value: string): string;
export function beta(value: number | string) { return value; }

function alpha(value: number): number;
function alpha(value: string): string;
function alpha(value: number | string) { return value; }

const values = { alpha: 1, beta: 2 };

for (const value of [values.alpha, values.beta].map((value) => alpha(value))) {
  beta(value);
}
`;

  fixture.write("example.ts", source);

  const checked = fixture.run("lint");

  assert.equal(checked.status, 0, checked.stdout + checked.stderr);
  assert.equal(fixture.run("lint:fix").status, 0);
  assert.equal(
    readFileSync(join(fixture.directory, "example.ts"), "utf8"),
    source,
  );
});

test("ambient variable declarations receive the same spacing", (t) => {
  const fixture = consumer(t);

  fixture.write(
    "example.d.ts",
    "declare const alpha: number;\ndeclare const beta: number;\nexport { alpha, beta };\n",
  );

  const result = fixture.run("lint:fix");

  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.equal(
    readFileSync(join(fixture.directory, "example.d.ts"), "utf8"),
    "declare const alpha: number;\n\ndeclare const beta: number;\n\nexport { alpha, beta };\n",
  );
});
