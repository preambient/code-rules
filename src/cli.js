#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";

const require = createRequire(import.meta.url);
const wrappers = {
  "oxfmt.config.mts":
    'export { default } from "@preambient/code-rules/oxfmt/preambient";\n',
  "oxlint.config.mts":
    'export { default } from "@preambient/code-rules/oxlint/preambient";\n',
};
const conflicts = [
  ".oxlintrc.json",
  ".oxlintrc.jsonc",
  "oxlint.config.ts",
  ".oxfmtrc.json",
  ".oxfmtrc.jsonc",
  "oxfmt.config.ts",
];

/** Run the package's pinned tool with the verified root configuration. */
function run(tool, args) {
  const manifestPath = require.resolve(`${tool}/package.json`);
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const binary = resolve(dirname(manifestPath), manifest.bin[tool]);
  const result = spawnSync(
    process.execPath,
    [binary, "--config", `${tool}.config.mts`, ...args],
    { stdio: "inherit" },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

/** Verify that editor and CLI configuration delegates to the published policy. */
function verify() {
  for (const file of conflicts) {
    if (existsSync(file))
      throw new Error(`Remove ${file}; use the shared policy wrappers.`);
  }
  for (const [file, content] of Object.entries(wrappers)) {
    if (
      !existsSync(file) ||
      readFileSync(file, "utf8").replaceAll("\r\n", "\n") !== content
    ) {
      throw new Error(`${file} must contain exactly:\n${content}`);
    }
  }
}

try {
  const [command, ...extra] = process.argv.slice(2);
  const commands = [
    "init",
    "verify",
    "lint",
    "lint:fix",
    "format",
    "format:check",
    "check",
  ];
  if (!commands.includes(command) || extra.length > 0) {
    throw new Error(`Usage: preambient-code-rules <${commands.join("|")}>`);
  }
  if (command === "init") {
    // Check every destination before writing either file.
    for (const file of [...conflicts, ...Object.keys(wrappers)]) {
      if (existsSync(file))
        throw new Error(
          `Refusing to overwrite existing configuration: ${file}`,
        );
    }
    for (const [file, content] of Object.entries(wrappers))
      writeFileSync(file, content, { flag: "wx" });
  }
  verify();
  if (["check", "lint", "lint:fix"].includes(command)) {
    run("oxlint", [
      "--deny-warnings",
      ...(command === "lint:fix" ? ["--fix"] : []),
    ]);
  }
  if (["check", "format", "format:check"].includes(command)) {
    run("oxfmt", [command === "format" ? "--write" : "--check"]);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
