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

const frontend = (
  await import(require.resolve("@preambient/code-rules/frontend"))
).default;

const preambient = (
  await import(require.resolve("@preambient/code-rules/oxlint/preambient"))
).default;

const rules = {
  "react-components/const-component": "error",
  "react-components/one-component-per-file": "error",
};

/** Run the published component policies against isolated JSX fixtures.
 * @param t - Test context responsible for fixture cleanup.
 * @returns A source checker using the package's actual Oxlint plugin.
 */
function fixture(t) {
  const directory = mkdtempSync(join(tmpdir(), "preambient-components-"));

  t.after(() => rmSync(directory, { force: true, recursive: true }));

  const config = join(directory, ".oxlintrc.json");

  writeFileSync(
    config,
    JSON.stringify({
      categories: { correctness: "off" },
      jsPlugins: frontend.jsPlugins.filter(
        (plugin) => plugin.name === "react-components",
      ),
      rules,
    }),
  );

  /** Lint a single component fixture through the real Oxlint executable.
   * @param code - JSX or TSX source to inspect.
   * @returns Diagnostics and process exit status.
   */
  const lint = (code) => {
    const source = join(directory, "example.tsx");

    writeFileSync(source, code);
    return spawnSync(
      process.execPath,
      [
        join(dirname(require.resolve("oxlint/package.json")), "bin/oxlint"),
        "--config",
        config,
        source,
      ],
      { cwd: directory, encoding: "utf8" },
    );
  };

  return lint;
}

test("frontend and monorepo presets enforce the same component policies", () => {
  for (const preset of [frontend, preambient])
    for (const [name, severity] of Object.entries(rules))
      assert.equal(preset.rules[name], severity);
});

test("const components coexist with ordinary functions, hooks, server operations and render callbacks", (t) => {
  const lint = fixture(t);

  for (const source of [
    "export const View = () => <div />;",
    "const Page = async () => <main />; export default Page;",
    'function format(value: string) { return value.trim(); } function useThing() { return null; } export const View = () => <div>{format("a")}</div>;',
    "async function save() { return null; } export const View = () => <div />;",
    "function Utility() { return 42; } export const View = () => <div />;",
    "export const View = () => <div>{[1, 2].map(function render(value) { return <span>{value}</span>; })}</div>;",
    "export const First = { render: () => <div /> }; export const Second = { render: () => <div /> };",
    'import { memo as cache } from "react"; export const View = cache(() => <div />);',
    'import React from "react"; export const View = React.forwardRef((props, ref) => <div ref={ref} />);',
    'import { lazy } from "react"; export const View = lazy(() => import("./view"));',
    'export { First } from "./first"; export { Second } from "./second";',
    "export const View = <Item,>(props: { item: Item }) => <div />;",
  ]) {
    const result = lint(source);

    assert.equal(
      result.status,
      0,
      `${source}\n${result.stdout}${result.stderr}`,
    );
  }
});

test("component declarations reject functions, function expressions, mutable bindings and anonymous defaults", (t) => {
  const lint = fixture(t);

  for (const source of [
    "export function View() { return <div />; }",
    "export default async function Page() { return <main />; }",
    "export default () => <div />;",
    "const View = function () { return <div />; };",
    "let View = () => <div />;",
    "var View = () => <div />;",
    'import { memo } from "react"; const View = memo(function View() { return <div />; });',
    'import React from "react"; function View() { return React.createElement("div"); }',
    'import { createElement as element } from "react"; function View() { return element("div"); }',
    "function View() { return null; }",
    "export function View(props) { return useRender(props); }",
    'import { Component } from "react"; class View extends Component { render() { return null; } }',
    'import React from "react"; const View = class extends React.Component { render() { return null; } };',
    "export const parts = { View: () => <div /> };",
    "export function View({ children }) { return children; }",
    "function View({ children }: { children: React.ReactNode }) { return children; } const App = () => <View />;",
  ]) {
    const result = lint(source);

    assert.notEqual(result.status, 0, source);
    assert.match(result.stdout + result.stderr, /const-component/);
  }
});

test("files cannot define multiple public, private, nested or wrapped components", (t) => {
  const lint = fixture(t);

  for (const source of [
    "export const First = () => <div />; export const Second = () => <div />;",
    "const Private = () => <div />; export const View = () => <Private />;",
    "export const View = () => { const Nested = () => <span />; return <Nested />; };",
    'import { memo } from "react"; const First = memo(() => <div />); const Second = memo(First);',
    'import { forwardRef } from "react"; const First = forwardRef(() => <div />); const Second = () => <div />;',
    'import { createElement } from "react"; const First = () => createElement("div"); const Second = () => null;',
    "const First: React.FC = () => text; const Second: React.FC = () => text;",
    "export const Page = async () => <main />; const Skeleton = () => <div />;",
    "const First = (props) => useRender(props); const Second = () => <div />;",
    'import { Component } from "react"; class View extends Component { render() { return null; } } const Second = () => <div />;',
    "export const parts = { First: () => <div />, Second: () => <div /> };",
  ]) {
    const result = lint(source);

    assert.notEqual(result.status, 0, source);
    assert.match(result.stdout + result.stderr, /one-component-per-file/);
  }
});
