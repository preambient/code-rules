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

test("format fixes ordinary strings and preserves interpolation", (t) => {
  const fixture = consumer(t);

  fixture.write(
    "example.ts",
    "export const greeting='hello'\n\nexport const message=`Hello ${greeting}`\n",
  );
  assert.notEqual(fixture.run("format:check").status, 0);

  const formatted = fixture.run("format");

  assert.equal(formatted.status, 0, formatted.stderr);
  assert.equal(
    readFileSync(join(fixture.directory, "example.ts"), "utf8"),
    'export const greeting = "hello";\n\nexport const message = `Hello ${greeting}`;\n',
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

test("component appearance is rejected in compositions and allowed only in registered primitive files", (t) => {
  const fixture = consumer(t);

  const source =
    'import { Button } from "@repo/ui/components/button";\n\n/** Render the fixture button.\n * @returns The example button element.\n */\nexport const Example = () => { return <Button className="rounded-full">Save</Button>; };\n';

  fixture.write("frontend/example.tsx", source);

  const rejected = fixture.run("lint");

  assert.notEqual(rejected.status, 0);
  assert.match(rejected.stdout + rejected.stderr, /no-restyle/);
  rmSync(join(fixture.directory, "frontend/example.tsx"));
  fixture.write(
    "frontend/packages/ui/src/components/pages/example.tsx",
    source,
  );

  const composition = fixture.run("lint");

  assert.notEqual(composition.status, 0);
  assert.match(
    composition.stdout + composition.stderr,
    /no-restyle|ui-contracts/,
  );
  rmSync(
    join(
      fixture.directory,
      "frontend/packages/ui/src/components/pages/example.tsx",
    ),
  );
  fixture.write("frontend/packages/ui/src/components/atoms/button.tsx", source);

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
      "declare const alpha: any, zebra: any;\n\n@zebra @alpha export class Example {}",
    "sort-enums": 'export enum Example { Zebra = "z", Alpha = "a" }',
    "sort-export-attributes":
      'export { value } from "example" with { zebra: "z", alpha: "a" };',
    "sort-exports": 'export * from "z"; export * from "a";',
    "sort-heritage-clauses":
      "interface Alpha { a: string } interface Zebra { z: string } export interface Value extends Zebra, Alpha { value: string }",
    "sort-import-attributes":
      'import value from "example" with { zebra: "z", alpha: "a" };\n\nexport { value };',
    "sort-imports":
      'import zebra from "z";\nimport alpha from "a";\n\nexport { alpha, zebra };',
    "sort-interfaces":
      "export interface Value { zebra: string; alpha: string; }",
    "sort-intersection-types":
      "type Alpha = { a: string }; type Zebra = { z: string }; export type Value = Zebra & Alpha;",
    "sort-jsx-props":
      'export const Example = () => { return <div title="z" id="a" />; };',
    "sort-maps": 'export const value = new Map([["z", 1], ["a", 2]]);',
    "sort-modules":
      "export function zebra() { return 1; }\n\nexport function alpha() { return 2; }",
    "sort-named-exports":
      "const alpha = 1;\n\nconst zebra = 2;\n\nexport { zebra, alpha };",
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
      'import { zebra, alpha } from "example";\n\nexport { alpha, zebra };',
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
    'declare function record(value: string): number;\n\nexport const object = { zebra: record("z"), alpha: record("a") };\n\nexport const set = new Set(["z", "a"]);\n\nexport const positional = ["z", "a"];\n';

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
    'import "z-side-effect";\nimport "a-side-effect";\n\nexport const value = 1;\n';

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
    'export const Example = () => { return <div title="z" id="a" />; };';

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
    'import { zebra } from "./zebra";\nimport "./initialize";\nimport { alpha } from "./alpha";\n\nexport { alpha, zebra };\nexport * from "./zebra";\nexport * from "./alpha";\ntype Zebra = (value: string) => "zebra";\ntype Alpha = (value: string) => "alpha";\nexport type Fn = Zebra & Alpha;\n';

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

test("type aliases are required in frontend, backend, and shared code", (t) => {
  const fixture = consumer(t);

  for (const file of [
    "frontend/example.ts",
    "backend/example.ts",
    "shared/example.ts",
  ]) {
    fixture.write(file, "export interface Example { value: string; }\n");

    const rejected = fixture.run("lint");

    assert.notEqual(rejected.status, 0);
    assert.match(
      rejected.stdout + rejected.stderr,
      /consistent-type-definitions/,
    );
    fixture.write(file, "export type Example = { value: string; };\n");

    const accepted = fixture.run("lint");

    assert.equal(accepted.status, 0, accepted.stdout + accepted.stderr);
  }
});

test("JSDoc is required for exported implementations and validates descriptions", (t) => {
  const fixture = consumer(t);

  const cases = [
    [
      "export function describeValue() { return 1; }",
      "/** Return the example value.\n * @returns The numeric example value.\n */ export function describeValue() { return 1; }",
    ],
    [
      "export const value = () => 1;",
      "/** Return the example value.\n * @returns The numeric example value.\n */ export const value = () => 1;",
    ],
    [
      "export const value = function named() { return 1; };",
      "/** Return the example value.\n * @returns The numeric example value.\n */ export const value = function named() { return 1; };",
    ],
    [
      "export default () => 1;",
      "/** Return the default example value.\n * @returns The default numeric value.\n */ export default () => 1;",
    ],
    [
      "export const value = { getValue() { return 1; } };",
      "export const value = { /** Return the stored example value.\n * @returns The stored numeric value.\n */ getValue() { return 1; } };",
    ],
    [
      "export const value = { getValue: () => 1 };",
      "export const value = { /** Return the stored example value.\n * @returns The stored numeric value.\n */ getValue: () => 1 };",
    ],
    [
      "export class Value { constructor() {} }",
      "export class Value { /** Initialize the example instance. */ constructor() {} }",
    ],
    [
      "export class Value { getValue() { return 1; } }",
      "export class Value { /** Return the stored example value.\n * @returns The stored numeric value.\n */ getValue() { return 1; } }",
    ],
    [
      "export class Value { get value() { return 1; } }",
      "export class Value { /** Read the example value.\n * @returns The stored numeric value.\n */ get value() { return 1; } }",
    ],
    [
      "export class Value { set value(_value: number) {} }",
      "export class Value { /** Accept and discard an example value.\n * @param _value - Incoming value intentionally discarded by this setter.\n */ set value(_value: number) {} }",
    ],
    [
      "export class Value { value = () => 1; }",
      "export class Value { /** Return the stored example value.\n * @returns The stored numeric value.\n */ value = () => 1; }",
    ],
    [
      "export const value = (() => 1) satisfies () => number;",
      "/** Return the example value with a checked signature.\n * @returns The numeric example value.\n */ export const value = (() => 1) satisfies () => number;",
    ],
    [
      "export async function value() { return 1; }",
      "/** Resolve the example value asynchronously.\n * @returns A promise resolving to the numeric example value.\n */ export async function value() { return 1; }",
    ],
    [
      "export function* values() { yield 1; }",
      "/** Yield the single example value.\n * @yields The numeric example value.\n */ export function* values() { yield 1; }",
    ],
    [
      "/** */ export function value() { return 1; }",
      "/** Return the example value.\n * @returns The numeric example value.\n */ export function value() { return 1; }",
    ],
    [
      "/** @returns The example value. */ export function value() { return 1; }",
      "/** Return the example value.\n * @returns The example value.\n */ export function value() { return 1; }",
    ],
    [
      "/** TODO */ export function value() { return 1; }",
      "/** Return the example value.\n * @returns The numeric example value.\n */ export function value() { return 1; }",
    ],
    [
      "/** Return the supplied value.\n * @param {number value - Value to return.\n */ export function value(value: number) { return value; }",
      "/** Return the example value.\n * @returns The numeric example value.\n */ export function value() { return 1; }",
    ],
    [
      "// Return the example value.\nexport function value() { return 1; }",
      "/** Return the example value.\n * @returns The numeric example value.\n */ export function value() { return 1; }",
    ],
  ];

  for (const [undocumented, documented] of cases) {
    fixture.write("frontend/example.ts", undocumented);

    const rejected = fixture.run("lint");

    assert.notEqual(rejected.status, 0, undocumented);
    assert.match(rejected.stdout + rejected.stderr, /jsdoc-js/, undocumented);
    fixture.write("frontend/example.ts", documented);

    const accepted = fixture.run("lint");

    assert.equal(
      accepted.status,
      0,
      documented + accepted.stdout + accepted.stderr,
    );
  }
});

test("documentation checks apply to every runtime, helpers, and tests without adding stubs", (t) => {
  const fixture = consumer(t);

  for (const file of [
    "backend/helper.ts",
    "frontend/helper.tsx",
    "shared/helper.ts",
    "internal/helper.ts",
    "backend/test/helper.test.ts",
    "internal/apps/admin-dashboard/helper.ts",
  ]) {
    const source = "export const helper = () => 1;\n";

    fixture.write(file, source);

    const rejected = fixture.run("lint:fix");

    assert.notEqual(rejected.status, 0, file);
    assert.match(rejected.stdout + rejected.stderr, /jsdoc-js/);
    assert.equal(readFileSync(join(fixture.directory, file), "utf8"), source);
    fixture.write(
      file,
      "/** Return the helper fixture value.\n * @returns The numeric helper value.\n */\n" +
        source,
    );

    const accepted = fixture.run("lint");

    assert.equal(accepted.status, 0, accepted.stdout + accepted.stderr);
  }
});

test("formatting preserves JSDoc on cast arrows and JSX callbacks", (t) => {
  const fixture = consumer(t);

  fixture.write(
    "frontend/example.tsx",
    `import { Button } from "@repo/ui/components/atoms/button";

export const value = /** Return the numeric fixture value.
 * @returns The numeric example value.
 */ (() => 1) as () => number;

export const object = { value: /** Return the object's numeric fixture value.
 * @returns The numeric property value.
 */ (() => 1) as () => number };

declare const supplied: (() => number) | undefined;

export const fallback = supplied ?? /** Return zero when no provider is supplied.
 * @returns Zero as the fallback numeric value.
 */ (() => 0);

/** Render the fixture button.
 * @returns The example button element.
 */
export const View = () => { return <Button onClick={/** Handle the fixture button click. */ () => {}}>Save</Button>; };
`,
  );
  assert.equal(fixture.run("format").status, 0);

  const result = fixture.run("lint");

  assert.equal(result.status, 0, result.stdout + result.stderr);
});

test("standard JSDoc tags and optional type annotations are accepted", (t) => {
  const fixture = consumer(t);

  fixture.write(
    "frontend/example.ts",
    `/**
 * @description Increment the provided numeric value.
 * @param {number} value - Value to increment.
 * @returns {number} The incremented value.
 */
export function increment(value: number) { return value + 1; }
`,
  );

  const result = fixture.run("lint");

  assert.equal(result.status, 0, result.stdout + result.stderr);
});

test("parameter and result tags must describe the real signature without generating stubs", (t) => {
  const fixture = consumer(t);

  const cases = [
    [
      "/** Increment the input.\n * @returns Incremented input.\n */\nexport const increment = (value: number) => value + 1;",
      /require-param/,
    ],
    [
      "/** Increment the input.\n * @param value - Input number to increment.\n */\nexport const increment = (value: number) => value + 1;",
      /require-returns/,
    ],
    [
      "/** Increment the input.\n * @param other - Input number to increment.\n * @returns Incremented input.\n */\nexport const increment = (value: number) => value + 1;",
      /check-param-names/,
    ],
    [
      "/** Increment the input.\n * @param value\n * @returns Incremented input.\n */\nexport const increment = (value: number) => value + 1;",
      /require-param-description/,
    ],
    [
      "/** Increment the input.\n * @param value - Input number to increment.\n * @returns\n */\nexport const increment = (value: number) => value + 1;",
      /require-returns-description/,
    ],
    [
      "/** Increment the input.\n * @param value - TODO\n * @returns Incremented input.\n */\nexport const increment = (value: number) => value + 1;",
      /match-description/,
    ],
    [
      "/** Finish asynchronous work. */\nexport async function finish(): Promise<void> {}",
      /require-returns/,
    ],
    [
      "/** Read the configured count.\n * @returns Configured count.\n */\nexport const read = ({ count }: { count: number }) => count;",
      /require-param/,
    ],
    [
      "/** Collect supplied counts.\n * @returns All supplied counts.\n */\nexport const collect = (...counts: number[]) => counts;",
      /require-param/,
    ],
    [
      "/** Yield the example count. */\nexport function* counts() { yield 1; }",
      /require-yields/,
    ],
    [
      "/** Yield the example count.\n * @yields\n */\nexport function* counts() { yield 1; }",
      /require-yields-description/,
    ],
  ];

  for (const [source, diagnostic] of cases) {
    fixture.write("frontend/example.ts", source);

    const rejected = fixture.run("lint:fix");

    assert.notEqual(rejected.status, 0, source);
    assert.match(rejected.stdout + rejected.stderr, diagnostic);
    assert.equal(
      readFileSync(join(fixture.directory, "frontend/example.ts"), "utf8"),
      source,
    );
  }
  fixture.write(
    "frontend/example.ts",
    `/** Read a count from an options object.
 * @param options - Options containing the count to read.
 * @returns Configured count.
 */
export const read = ({ count }: { count: number }) => count;

/** Finish asynchronous work.
 * @returns Completion after the asynchronous operation finishes; no value is produced.
 */
export async function finish(): Promise<void> {}

/** Collect supplied counts.
 * @param counts - Count values to collect in their original order.
 * @returns All supplied counts.
 */
export const collect = (...counts: number[]) => counts;

/** Increment an optional count.
 * @param [value=0] - Starting count, defaulting to zero.
 * @returns Count incremented by one.
 */
export const increment = (value = 0) => value + 1;

/** Perform a synchronous side effect without a result. */
export function notify(): void {}
`,
  );

  const accepted = fixture.run("lint");

  assert.equal(accepted.status, 0, accepted.stdout + accepted.stderr);
});

test("inline callbacks and private helpers do not require JSDoc", (t) => {
  const fixture = consumer(t);

  const cases = [
    `/** Normalize configured origins.
 * @param configured - Comma-separated HTTP origins.
 * @returns Nonempty origins with surrounding whitespace removed.
 */
export function origins(configured: string) {
  return configured.split(",").map((origin) => origin.trim()).filter(Boolean);
}`,
    `declare function configure(options: { integrations: (defaults: { name: string }[]) => { name: string }[] }): void;

configure({ integrations: (defaults) => defaults.filter((integration) => ["Dedupe", "FunctionToString", "InboundFilters", "LinkedErrors"].includes(integration.name)) });`,
    `declare function beforeEach(callback: () => void): void;
declare function describe(name: string, callback: () => void): void;
declare function test(name: string, callback: () => Promise<void> | void): void;

describe("documented API", () => {
  beforeEach(() => {});
  test("handles a request", async () => { await Promise.resolve().then(() => {}); });
});`,
    `/** Trim a request value before forwarding it.
 * @param value - Raw request value.
 * @returns Normalized request value.
 */
export function normalize(value: string) {
  const trim = (input: string) => input.trim();

  function forward(input: string) { return input; }

  return forward(trim(value));
}`,
    `const normalize = (value: string) => value.trim();

export const result = normalize(" example ");`,
    `/** Build a numeric value reader.
 * @returns Callback reading the stored example value.
 */
export function reader() { return () => 1; }`,
    `export class Value {
  /** Read the numeric value.
   * @returns Stored numeric value.
   */
  read() { return this.#read() + this.normalize("1").length; }
  protected reset() {}
  #read = () => 1;
  private normalize(value: string) { return value.trim(); }
}`,
    `import { Button } from "@repo/ui/components/atoms/button";

declare function useEffect(callback: () => (() => void), dependencies: unknown[]): void;

/** Render a button after registering cleanup.
 * @returns The button element.
 */
export const View = () => {
  useEffect(() => { return () => {}; }, []);
  return <Button onClick={() => {}}>Save</Button>;
};`,
  ];

  for (const source of cases) {
    fixture.write("frontend/example.tsx", source);

    const accepted = fixture.run("lint");

    assert.equal(
      accepted.status,
      0,
      source + accepted.stdout + accepted.stderr,
    );
  }
});

test("separately exported functions and public methods still require complete docs", (t) => {
  const fixture = consumer(t);

  for (const source of [
    "const read = () => 1;\n\nexport { read };",
    "function read() { return 1; }\n\nexport default read;",
    "const api = { read: () => 1 };\n\nexport { api };",
    "export class Api { read() { return 1; } }",
  ]) {
    fixture.write("frontend/example.ts", source);

    const rejected = fixture.run("lint");

    assert.notEqual(rejected.status, 0, source);
    assert.match(rejected.stdout + rejected.stderr, /require-jsdoc/);
  }
  fixture.write(
    "frontend/example.ts",
    `/** Read the stored number.
 * @returns Stored numeric value.
 */
const read = () => 1;

export { read };`,
  );

  const accepted = fixture.run("lint");

  assert.equal(accepted.status, 0, accepted.stdout + accepted.stderr);
});

test("export traversal follows API aliases without turning data callbacks into APIs", (t) => {
  const fixture = consumer(t);

  for (const source of [
    "const read = () => 1;\n\nconst api = { read };\n\nexport default api;",
    "const api = { nested: { read: () => 1 } };\n\nexport { api };",
    "const api = { read: () => 1 };\n\nexport const copied = { ...api };",
    "declare const flag: boolean;\n\nexport const read = flag ? () => 1 : () => 2;",
    "declare const read: (() => number) | undefined;\n\nexport const fallback = read ?? (() => 1);",
  ]) {
    fixture.write("frontend/example.ts", source);

    const rejected = fixture.run("lint");

    assert.notEqual(rejected.status, 0, source);
    assert.match(rejected.stdout + rejected.stderr, /require-jsdoc/);
  }
  fixture.write(
    "frontend/example.ts",
    `export const origins = [" localhost "].map((origin) => origin.trim());

export const ready = Promise.resolve().then(() => 1);

const api = { read: () => 1 };

export const result = api.read();`,
  );

  const accepted = fixture.run("lint");

  assert.equal(accepted.status, 0, accepted.stdout + accepted.stderr);
});

test("CommonJS exports retain public function documentation requirements", (t) => {
  const fixture = consumer(t);

  for (const source of [
    "module.exports = () => 1;",
    "exports.read = () => 1;",
    'module["exports"].read = () => 1;',
    "const api = { read: () => 1 };\n\nmodule.exports = api;",
  ]) {
    fixture.write("example.cjs", source);

    const rejected = fixture.run("lint");

    assert.notEqual(rejected.status, 0, source);
    assert.match(rejected.stdout + rejected.stderr, /require-jsdoc/);
  }
  fixture.write(
    "example.cjs",
    `/** Read the stored value.
 * @returns The numeric fixture value.
 */
module.exports = () => 1;`,
  );

  const accepted = fixture.run("lint");

  assert.equal(accepted.status, 0, accepted.stdout + accepted.stderr);
});

test("optional private JSDoc is validated when supplied", (t) => {
  const fixture = consumer(t);

  fixture.write(
    "frontend/example.ts",
    "/** Normalize a local value. */\nconst trim = (value: string) => value.trim();\n\nexport const normalized = trim(' value ');",
  );

  const rejected = fixture.run("lint");

  assert.notEqual(rejected.status, 0);
  assert.match(rejected.stdout + rejected.stderr, /require-param/);
  assert.match(rejected.stdout + rejected.stderr, /require-returns/);
  fixture.write(
    "frontend/example.ts",
    "// Normalize before calling the downstream service.\nconst trim = (value: string) => value.trim();\n\nexport const normalized = trim(' value ');",
  );

  const accepted = fixture.run("lint");

  assert.equal(accepted.status, 0, accepted.stdout + accepted.stderr);
});

test("static member and destructured exports select only exposed implementations", (t) => {
  const fixture = consumer(t);

  for (const source of [
    "const api = { helper: () => 2, read: () => 1 };\n\nexport const read = api.read;",
    'const api = { helper: () => 2, read: () => 1 };\n\nexport const read = api["read"];',
    "const api = { helper: () => 2, read: () => 1 };\n\nexport const { read } = api;",
    "const api = { helper: () => 2, read: () => 1 };\n\nconst { read: selected } = api;\n\nexport { selected };",
    "const api = { helper: () => 2, nested: { read: () => 1 } };\n\nconst { nested: { read } } = api;\n\nexport { read };",
    "class Api { static helper() { return 2; } static read() { return 1; } }\n\nexport const read = Api.read;",
    "const api = {};\n\nexport const { read = () => 1 } = api;",
    "const callbacks = [() => 1, () => 2];\n\nconst [read] = callbacks;\n\nexport { read };",
  ]) {
    fixture.write("frontend/example.ts", source);

    const rejected = fixture.run("lint");

    assert.notEqual(rejected.status, 0, source);
    assert.equal(
      (rejected.stdout + rejected.stderr).match(/jsdoc-js\(require-jsdoc\)/g)
        ?.length,
      1,
      source + rejected.stdout + rejected.stderr,
    );
  }
  fixture.write(
    "frontend/example.ts",
    "const api = { get value() { return 1; } };\n\nexport const value = api.value;",
  );

  const getterValue = fixture.run("lint");

  assert.equal(getterValue.status, 0, getterValue.stdout + getterValue.stderr);

  for (const exported of [
    "export const read = api.read;",
    'export const read = api["read"];',
    "export const { read } = api;",
    "const { read: selected } = api;\n\nexport { selected };",
  ]) {
    fixture.write(
      "frontend/example.ts",
      `const api = {
  helper: () => 2,

  /** Read the stored numeric value.
   * @returns Stored numeric value.
   */
  read: () => 1,
};

${exported}`,
    );

    const accepted = fixture.run("lint");

    assert.equal(
      accepted.status,
      0,
      exported + accepted.stdout + accepted.stderr,
    );
  }
});

test("runtime export bindings survive type declarations and later identifier assignment", (t) => {
  const fixture = consumer(t);

  for (const source of [
    `/* oxlint-disable perfectionist/sort-modules */
function read() { return 1; }

type read = number;
export { read };`,
    "let read;\n\nread = () => 1;\n\nexport { read };",
    "let read;\n\nread = () => 1;\n\nconst alias = read;\n\nexport { alias };",
  ]) {
    fixture.write("shared/example.ts", source);

    const rejected = fixture.run("lint");

    assert.notEqual(rejected.status, 0, source);
    assert.match(rejected.stdout + rejected.stderr, /require-jsdoc/);
  }
  fixture.write(
    "shared/example.ts",
    `/* oxlint-disable perfectionist/sort-modules */
/** Read the stored numeric value.
 * @returns Stored numeric value.
 */
function read() { return 1; }

type read = number;
export { read };`,
  );

  const accepted = fixture.run("lint");

  assert.equal(accepted.status, 0, accepted.stdout + accepted.stderr);
});

test("local runtime module and exports bindings are not CommonJS exports", (t) => {
  const fixture = consumer(t);

  for (const source of [
    "const exports = {};\n\nexports.read = () => 1;\n\nexport const marker = 1;",
    "const module = { exports: {} };\n\nmodule.exports.read = () => 1;\n\nexport const marker = 1;",
    "const { exports } = { exports: {} };\n\nexports.read = () => 1;\n\nexport const marker = 1;",
    "const { ...exports } = {};\n\nexports.read = () => 1;\n\nexport const marker = 1;",
    'import exports from "example";\n\nexports.read = () => 1;\n\nexport const marker = 1;',
    'import module from "example";\n\nmodule.exports.read = () => 1;\n\nexport const marker = 1;',
  ]) {
    fixture.write("frontend/example.ts", source);

    const accepted = fixture.run("lint");

    assert.equal(
      accepted.status,
      0,
      source + accepted.stdout + accepted.stderr,
    );
  }
  for (const source of [
    "type module = number; module.exports = () => 1;",
    'import type { module } from "example";\n\nmodule.exports = () => 1;',
  ]) {
    fixture.write("frontend/example.ts", source);

    const rejected = fixture.run("lint");

    assert.notEqual(rejected.status, 0, source);
    assert.match(rejected.stdout + rejected.stderr, /require-jsdoc/);
  }
});

test("event modules require resource names across authored JavaScript and TypeScript extensions", (t) => {
  const fixture = consumer(t);

  for (const extension of [
    "js",
    "jsx",
    "mjs",
    "cjs",
    "ts",
    "tsx",
    "mts",
    "cts",
  ]) {
    fixture.write(`backend/organizations/events.${extension}`, "export {};\n");
  }

  fixture.write("frontend/events.tsx", "export {};\n");
  fixture.write("shared/events.mts", "export {};\n");

  const rejected = fixture.run("lint");

  assert.notEqual(rejected.status, 0);
  assert.match(rejected.stdout + rejected.stderr, /resource-event-modules/);
  assert.match(rejected.stdout + rejected.stderr, /organization\.events\.ts/);
  for (const extension of [
    "js",
    "jsx",
    "mjs",
    "cjs",
    "ts",
    "tsx",
    "mts",
    "cts",
  ]) {
    assert.match(
      rejected.stdout + rejected.stderr,
      new RegExp(`events\\.${extension}:`),
    );
  }

  const fixed = fixture.run("lint:fix");

  assert.notEqual(fixed.status, 0);
  assert.match(fixed.stdout + fixed.stderr, /resource-event-modules/);
  fixture.write("backend/organizations/events.ts", "");

  const empty = fixture.run("lint");

  assert.notEqual(empty.status, 0);
  assert.match(empty.stdout + empty.stderr, /events\.ts:/);
});

test("resource event filenames and event directories remain valid in every runtime", (t) => {
  const fixture = consumer(t);

  for (const file of [
    "backend/organizations/organization.events.ts",
    "backend/notifications/notification.events.ts",
    "backend/events/index.ts",
    "backend/types.ts",
    "frontend/events/index.tsx",
    "frontend/organization.events.jsx",
    "shared/organization.events.mts",
    "shared/notification.events.cts",
    "dist/events.ts",
  ]) {
    fixture.write(file, "export {};\n");
  }

  const allowed = fixture.run("lint");

  assert.equal(allowed.status, 0, allowed.stdout + allowed.stderr);
});

test("UI contracts accept semantic Typography, atomic owners, aliases, and declared slots", (t) => {
  const fixture = consumer(t);

  fixture.write(
    "frontend/arrange.tsx",
    `import type { ReactNode } from "react";

type Slots = { children: ReactNode; hint?: ReactNode };

/** Forward explicitly declared renderable slots.
 * @param props - Main and hint slots.
 * @returns The arranged content.
 */
export const Arrange = ({ children, hint }: Readonly<Slots>) => { return <div>{children}{hint}</div>; };
`,
  );
  fixture.write(
    "frontend/example.tsx",
    `import { Button as Action } from "@repo/ui/components/atoms/button";
import * as Text from "@repo/ui/components/atoms/typography";

const Copy = Text.Typography.p;

/** Compose canonical text and controls.
 * @returns The semantic example.
 */
export const Example = () => { return <div><Copy>Hello <Text.Typography.strong>team</Text.Typography.strong></Copy><Action className="mt-2 w-full"><span lang="en">Save</span></Action><Text.Typography.ul className="flex flex-col gap-2"><Text.Typography.li>One</Text.Typography.li><Text.Typography.li>Two</Text.Typography.li></Text.Typography.ul></div>; };
`,
  );

  const result = fixture.run("lint");

  assert.equal(result.status, 0, result.stdout + result.stderr);
});

test("UI contracts accept JSX render props and parenthesized mapped elements", (t) => {
  const fixture = consumer(t);

  fixture.write(
    "frontend/example.tsx",
    `import { Typography } from "@repo/ui/components/atoms/typography";

/** Compose a streamed query and mapped links.
 * @param props - Query component and labels.
 * @returns Owned text inside layout elements.
 */
export const Example = ({ labels, Query }: { labels: string[]; Query: any }) => {
  return <Query>{() => (<nav><Typography.ul>{labels.map((label) => (<Typography.li key={label}><Typography.a href="/">{label}</Typography.a></Typography.li>))}</Typography.ul></nav>)}</Query>;
};
`,
  );

  const result = fixture.run("lint");

  assert.equal(result.status, 0, result.stdout + result.stderr);
});

test("generated GraphQL ordering exceptions retain correctness and stay narrowly scoped", (t) => {
  const fixture = consumer(t);

  for (const app of ["console", "platform"])
    fixture.write(
      `frontend/apps/${app}/lib/graphql/generated.ts`,
      "export const document = { z: 1, a: 2 };\n",
    );

  const allowed = fixture.run("lint");

  assert.equal(allowed.status, 0, allowed.stdout + allowed.stderr);
  fixture.write(
    "frontend/apps/console/lib/graphql/generated.ts",
    "export const document = { z: 1, a: 2 }; document = {};\n",
  );
  fixture.write(
    "frontend/apps/console/lib/graphql/handwritten.ts",
    "export const document = { z: 1, a: 2 };\n",
  );

  const rejected = fixture.run("lint");

  assert.notEqual(rejected.status, 0);
  assert.match(rejected.stdout + rejected.stderr, /no-const-assign/u);
  assert.match(
    rejected.stdout + rejected.stderr,
    /handwritten.ts.*sort-objects/u,
  );
});

test("UI contracts reject text and component styling escapes across composition levels", async (t) => {
  const cases = {
    "bare text": "<div>Hello</div>",
    "children attribute": '<div children="Hello" />',
    "conditional text": '<div>{Date.now() ? "yes" : "no"}</div>',

    "conditional typography":
      '<div className={Date.now() ? "text-sm" : "text-lg"}><Copy>Hello</Copy></div>',
    "constant typography":
      "<div className={textStyle}><Copy>Hello</Copy></div>",
    "custom button role":
      '<div role="button" tabIndex={0}><Copy>Save</Copy></div>',
    "dynamic text": "<div>{String(Date.now())}</div>",
    "forged Typography": "<Local.p>Hello</Local.p>",
    "fragment text": "<>Hello</>",
    "inline style": "<Copy style={{ fontSize: 30 }}>Hello</Copy>",
    "layout inherited typography":
      '<div className="font-semibold"><Copy>Hello</Copy></div>',
    "list padding override":
      '<Typography.ul className="p-4"><Typography.li>One</Typography.li></Typography.ul>',
    "mapped parenthesized strings":
      '<div>{["one", "two"].map((value) => (value))}</div>',
    "mapped strings": '<div>{["one", "two"].map((value) => value)}</div>',
    "native button": '<button type="button">Save</button>',
    "native input": '<input aria-label="Name" />',

    "raw dynamic span": "<span>{String(Date.now())}</span>",
    "raw paragraph": "<p>Hello</p>",
    "rendered strings": '<Query>{() => "Hello"}</Query>',
    "rendered unowned text": "<Query>{() => (<div>Hello</div>)}</Query>",
    "sized button": '<Action className="h-16 px-8">Save</Action>',
    "structural component": "<Field>Hello</Field>",
    "styled button alias": '<Action className="rounded-full">Save</Action>',
    "styled component member alias": '<Renamed className="py-8">Save</Renamed>',
    "typography override": '<Copy className="text-xl">Hello</Copy>',
    "untyped children": "<div>{children}</div>",
  };

  const fixture = consumer(t);

  const files = new Map();

  for (const [name, expression] of Object.entries(cases)) {
    const file = `frontend/packages/ui/stories/pages/${name.replaceAll(" ", "-")}.tsx`;

    files.set(name, file);
    fixture.write(
      file,
      `import { Button as Action } from "@repo/ui/components/atoms/button";
import { Typography } from "@repo/ui/components/atoms/typography";
import { Field } from "@repo/ui/components/molecules/field";

const Copy = Typography.p;

const Renamed = Action;

const textStyle = "text-xl";

/** Render a policy fixture.
 * @param props - Unapproved string children.
 * @returns The fixture.
 */
export function Example({ children }: { children: string }) { return ${expression}; }
`,
    );
  }

  const result = fixture.run("lint");

  const output = result.stdout + result.stderr;

  assert.notEqual(result.status, 0);
  for (const [name, file] of files)
    await t.test(name, () => {
      assert.ok(
        output
          .split("\n")
          .some(
            (line) =>
              line.includes(file) &&
              /ui-contracts|no-restyle|Render authored text|shared UI primitive|canonical variants|Text appearance|Inline styles/u.test(
                line,
              ),
          ),
        `${name}: ${output}`,
      );
    });
});

test("CSS contracts reject text overrides, primitive selectors, apply escapes and inline suppressions", async (t) => {
  const cases = {
    apply: ["frontend/example.css", ".layout { @apply text-xl; }"],
    color: ["frontend/example.css", ".layout { color: red; }"],
    selector: [
      "frontend/example.css",
      '[data-slot="button"] { padding: 2rem; }',
    ],
    suppression: [
      "frontend/example.tsx",
      "// oxlint-disable ui-policy/ui-contracts\nexport const value = <div>Hello</div>;",
    ],
    typography: ["frontend/example.css", ".copy { font-size: 18px; }"],
  };

  for (const [name, [file, source]] of Object.entries(cases))
    await t.test(name, (context) => {
      const fixture = consumer(context);

      fixture.write(file, source);

      const result = fixture.run("lint");

      assert.notEqual(result.status, 0);
      assert.match(result.stdout + result.stderr, /ui-contracts/);
    });
});

test("CSS layout and the existing scoped MDX wrapper remain approved", (t) => {
  const fixture = consumer(t);

  fixture.write("frontend/layout.css", ".layout { display: grid; gap: 1rem; }");
  fixture.write(
    "frontend/packages/ui/.storybook/overview-document.tsx",
    `/** Render the existing MDX surface.
 * @returns Scoped document typography.
 */
export const Overview = () => { return <div className="typeset typeset-docs" style={{ maxWidth: "33em" }}>Rendered MDX</div>; };
`,
  );

  const result = fixture.run("lint");

  assert.equal(result.status, 0, result.stdout + result.stderr);
});

test("the existing next-intl declaration-merging suppression cannot disable UI contracts", (t) => {
  const fixture = consumer(t);

  const file = "frontend/packages/i18n/src/frontend/index.ts";

  fixture.write(
    file,
    "// next-intl requires an interface for declaration merging.\n// oxlint-disable-next-line typescript/consistent-type-definitions\nexport interface AppConfig { Locale: string; }\n",
  );

  const accepted = fixture.run("lint");

  assert.equal(accepted.status, 0, accepted.stdout + accepted.stderr);
  fixture.write(
    file,
    "// oxlint-disable ui-policy/ui-contracts\nexport const value = 1;\n",
  );

  const rejected = fixture.run("lint");

  assert.notEqual(rejected.status, 0);
  assert.match(rejected.stdout + rejected.stderr, /ui-contracts/);
});

test("lower-level control imports, createElement text and nested configurations cannot bypass UI contracts", (t) => {
  const fixture = consumer(t);

  fixture.write(
    "frontend/oxlint.config.ts",
    'export default { rules: { "ui-policy/ui-contracts": "off" } };\n',
  );
  fixture.write(
    "frontend/escape.tsx",
    `import { Button } from "@base-ui/react/button";
import { createElement } from "react";

export const element = createElement("p", null, "Unowned text");

export const control = <Button />;

export const html = <div dangerouslySetInnerHTML={{ __html: "Unowned text" }} />;
`,
  );

  const result = fixture.run("lint");

  assert.notEqual(result.status, 0);
  assert.match(result.stdout + result.stderr, /ui-contracts/);
  assert.match(result.stdout + result.stderr, /Render authored text/);
  assert.match(result.stdout + result.stderr, /shared UI primitive/);
});

test("Storybook args cannot restyle the canonical component through generated rendering", (t) => {
  const fixture = consumer(t);

  fixture.write(
    "frontend/example.stories.tsx",
    `export const Resized = { args: { className: "text-xl rounded-full" } };

export const InlineStyle = { args: { style: { fontSize: 28 } } };
`,
  );

  const rejected = fixture.run("lint");

  assert.notEqual(rejected.status, 0);
  assert.match(rejected.stdout + rejected.stderr, /ui-contracts/);
  fixture.write(
    "frontend/example.stories.tsx",
    'export const FullWidth = { args: { className: "w-full" } };\n',
  );

  const accepted = fixture.run("lint");

  assert.equal(accepted.status, 0, accepted.stdout + accepted.stderr);
});

test("app shell primitives accept canonical parts and keep structural containers protected", (t) => {
  const fixture = consumer(t);

  fixture.write(
    "frontend/example.tsx",
    `import { DropdownMenuItem } from "@repo/ui/components/molecules/dropdown-menu";
import { EmptyTitle } from "@repo/ui/components/molecules/empty";
import { TableCell } from "@repo/ui/components/molecules/table";
import { TooltipContent } from "@repo/ui/components/molecules/tooltip";
import { DialogTitle } from "@repo/ui/components/organisms/dialog";
import { SidebarMenuButton } from "@repo/ui/components/organisms/sidebar";

/** Compose the registered text-owning parts.
 * @returns Canonical interface parts with their own copy.
 */
export const Example = () => { return <><DropdownMenuItem>Theme</DropdownMenuItem><EmptyTitle>No clients</EmptyTitle><TableCell>Client</TableCell><TooltipContent>Details</TooltipContent><DialogTitle>Add client</DialogTitle><SidebarMenuButton>Clients</SidebarMenuButton></>; };
`,
  );

  const accepted = fixture.run("lint");

  assert.equal(accepted.status, 0, accepted.stdout + accepted.stderr);
  for (const expression of [
    '<SidebarMenuButton className="bg-red-500">Clients</SidebarMenuButton>',
    "<SidebarHeader>Clients</SidebarHeader>",
    "<EmptyContent>No clients</EmptyContent>",
    "<DialogContent>Add client</DialogContent>",
    "<TableRow>Client</TableRow>",
  ]) {
    fixture.write(
      "frontend/example.tsx",
      `import { EmptyContent } from "@repo/ui/components/molecules/empty";
import { TableRow } from "@repo/ui/components/molecules/table";
import { DialogContent } from "@repo/ui/components/organisms/dialog";
import { SidebarHeader, SidebarMenuButton } from "@repo/ui/components/organisms/sidebar";

/** Verify structural parts do not inherit primitive text ownership.
 * @returns The rejected composition.
 */
export function Example() { return ${expression}; }
`,
    );

    const rejected = fixture.run("lint");

    assert.notEqual(rejected.status, 0, expression);
    assert.match(
      rejected.stdout + rejected.stderr,
      /ui-contracts|no-raw-colors|no-restyle/,
    );
  }
});

test("single-component primitive files retain exact styling and text-ownership contracts", (t) => {
  const fixture = consumer(t);

  const primitive =
    "frontend/packages/ui/src/components/molecules/dropdown-menu/dropdown-menu-item.tsx";

  const source = `/** Render the canonical menu item.
 * @returns The owned menu control.
 */
export const DropdownMenuItem = () => <button className="rounded-[4px]">Save</button>;
`;

  fixture.write(primitive, source);
  fixture.write(
    "frontend/example.tsx",
    `import { DropdownMenuItem } from "@repo/ui/components/molecules/dropdown-menu/dropdown-menu-item";

/** Compose a directly imported canonical text-owning part.
 * @returns The menu action.
 */
export const Example = () => <DropdownMenuItem>Save</DropdownMenuItem>;
`,
  );

  const allowed = fixture.run("lint");

  assert.equal(allowed.status, 0, allowed.stdout + allowed.stderr);
  rmSync(join(fixture.directory, primitive));
  fixture.write(
    "frontend/packages/ui/src/components/molecules/dropdown-menu/custom-item.tsx",
    source,
  );

  const rejected = fixture.run("lint");

  assert.notEqual(rejected.status, 0);
  assert.match(
    rejected.stdout + rejected.stderr,
    /ui-contracts|no-arbitrary-values/,
  );
});
