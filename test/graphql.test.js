import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const packageRoot =
  process.env.CODE_RULES_PACKAGE_ROOT ??
  resolve(dirname(fileURLToPath(import.meta.url)), "..");

const { checkGraphqlSchema } = await import(
  pathToFileURL(join(packageRoot, "src/graphql.js")).href
);

const valid = `
"Application reads."
type Query {
  "Available items."
  items("Maximum returned items." first: Int, "Opaque position." after: String): ItemConnection!
}
"Application writes."
type Mutation {
  "Create an item."
  createItem("Values for the new item." input: CreateItemInput!): CreateItemPayload
}
"Editable item values."
input CreateItemInput {
  "Display name." name: String!
}
"Creation outcome."
type CreateItemPayload {
  "The created item." item: Item
}
"An item belonging to the viewer."
type Item {
  "Stable identifier." id: ID!
  "Display name." name: String!
  "Former display label." label: String @deprecated(reason: "Use name instead.")
  "Current lifecycle." status: ItemStatus!
}
"Available lifecycle states."
enum ItemStatus {
  "Ready to use." ACTIVE
  "No longer in use." ARCHIVED
}
"A bounded page of items."
type ItemConnection {
  "Items in stable order." nodes: [Item!]!
  "Continuation information." pageInfo: PageInfo!
}
"Forward pagination state."
type PageInfo {
  "Whether another page exists." hasNextPage: Boolean!
  "Cursor of the last item, null for an empty page." endCursor: String
}
`;

test("accepts documented schema conventions", () => {
  assert.deepEqual(checkGraphqlSchema(valid), []);
});

test("rejects naming, mutation shape, connection shape, and missing documentation", () => {
  const cases = [
    [valid.replaceAll("ItemStatus", "item_status"), "graphql/type-name"],
    [
      valid.replace("name: String!", "display_name: String!"),
      "graphql/field-name",
    ],
    [valid.replace("ACTIVE", "active"), "graphql/enum-value"],
    [
      valid.replaceAll("CreateItemInput", "CreateItemValues"),
      "graphql/input-name",
    ],
    [valid.replace("createItem(", "itemCreate("), "graphql/mutation-name"],
    [
      valid.replace("input: CreateItemInput!", "input: CreateItemInput"),
      "graphql/mutation-input",
    ],
    [
      valid.replace("): CreateItemPayload", "): Item"),
      "graphql/mutation-payload",
    ],
    [
      valid.replace("nodes: [Item!]!", "items: [Item!]!"),
      "graphql/connection-nodes",
    ],
    [
      valid.replace("nodes: [Item!]!", "nodes: [Item]!"),
      "graphql/connection-nodes",
    ],
    [
      valid.replace("pageInfo: PageInfo!", "pageInfo: PageInfo"),
      "graphql/connection-page-info",
    ],
    [valid.replace('"Display name." name:', "name:"), "graphql/description"],
    [valid.replace('"Display name."', '"TODO"'), "graphql/description"],
    [
      valid.replace('(reason: "Use name instead.")', ""),
      "graphql/deprecation-reason",
    ],
    [
      valid.replace('reason: "Use name instead."', 'reason: " "'),
      "graphql/deprecation-reason",
    ],
  ];

  for (const [source, rule] of cases) {
    const diagnostics = checkGraphqlSchema(source, "fixture.graphql");

    assert.ok(
      diagnostics.some((diagnostic) => diagnostic.rule === rule),
      JSON.stringify(diagnostics),
    );
    assert.ok(
      diagnostics.every(
        (diagnostic) =>
          diagnostic.sourceName === "fixture.graphql" &&
          diagnostic.line > 0 &&
          diagnostic.column > 0,
      ),
    );
  }
});

test("reports malformed SDL and invalid schema without throwing", () => {
  assert.equal(checkGraphqlSchema("type {")[0].rule, "graphql/syntax");
  assert.ok(
    checkGraphqlSchema(
      valid.replace("status: ItemStatus!", "status: Missing!"),
    ).some((diagnostic) => diagnostic.rule === "graphql/schema"),
  );
  assert.ok(
    checkGraphqlSchema(
      valid + '\n"Conflicting type." type Item { "Identifier." id: ID! }',
    ).some((diagnostic) => diagnostic.rule === "graphql/schema"),
  );
});

test("supports custom operation roots and combines connection extensions", () => {
  const source = valid
    .replace(
      "type Mutation",
      'schema { query: Query mutation: Writes }\n"Write operations." type Writes',
    )
    .replace(
      '  "Continuation information." pageInfo: PageInfo!\n}',
      '}\nextend type ItemConnection { "Continuation information." pageInfo: PageInfo! }',
    );

  assert.deepEqual(checkGraphqlSchema(source), []);
  assert.ok(
    checkGraphqlSchema(
      source.replace("input: CreateItemInput!", "input: CreateItemInput"),
    ).some((diagnostic) => diagnostic.rule === "graphql/mutation-input"),
  );
});

test("CLI checks multiple complete schemas without Oxc wrappers and fails on rejected schema", (t) => {
  const directory = mkdtempSync(join(tmpdir(), "preambient-graphql-"));

  t.after(() => rmSync(directory, { force: true, recursive: true }));
  writeFileSync(join(directory, "valid.graphql"), valid);
  writeFileSync(
    join(directory, "invalid.graphql"),
    valid.replace("ACTIVE", "active"),
  );

  const run = (...args) =>
    spawnSync(
      process.execPath,
      [join(packageRoot, "src/cli.js"), "graphql:check", ...args],
      { cwd: directory, encoding: "utf8" },
    );

  assert.equal(run("valid.graphql").status, 0);
  assert.notEqual(run().status, 0);
  assert.notEqual(run("missing.graphql").status, 0);

  const result = run("valid.graphql", "invalid.graphql");

  assert.equal(result.status, 1);
  assert.match(result.stderr, /invalid\.graphql:\d+:\d+ graphql\/enum-value/);
});

test("package export resolves the public API from the installed package", () => {
  const result = spawnSync(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      'import { checkGraphqlSchema } from "@preambient/code-rules/graphql"; if (typeof checkGraphqlSchema !== "function") process.exit(1);',
    ],
    { cwd: packageRoot, encoding: "utf8" },
  );

  assert.equal(result.status, 0, result.stderr);
});

test("mutation inputs and payloads must be object types, and nodes cannot be nested lists", () => {
  const scalarInput = valid.replace(
    /input CreateItemInput \{[\s\S]*?\}/,
    "scalar CreateItemInput",
  );

  const scalarPayload = valid.replace(
    /type CreateItemPayload \{[\s\S]*?\}/,
    "scalar CreateItemPayload",
  );

  assert.ok(
    checkGraphqlSchema(scalarInput).some(
      (diagnostic) => diagnostic.rule === "graphql/mutation-input",
    ),
  );
  assert.ok(
    checkGraphqlSchema(scalarPayload).some(
      (diagnostic) => diagnostic.rule === "graphql/mutation-payload",
    ),
  );
  assert.ok(
    checkGraphqlSchema(
      valid.replace("nodes: [Item!]!", "nodes: [[Item!]!]!"),
    ).some((diagnostic) => diagnostic.rule === "graphql/connection-nodes"),
  );
});

test("query root names omit get/fetch and boolean fields use is/has/can", () => {
  const booleanInput = valid.replace(
    '"Display name." name: String!',
    '"Whether enabled." isEnabled: Boolean!',
  );

  assert.deepEqual(checkGraphqlSchema(booleanInput), []);
  assert.ok(
    checkGraphqlSchema(
      booleanInput.replace("isEnabled: Boolean!", "enabled: Boolean!"),
    ).some((diagnostic) => diagnostic.rule === "graphql/boolean-name"),
  );
  assert.ok(
    checkGraphqlSchema(
      valid.replace("hasNextPage: Boolean!", "nextPage: Boolean!"),
    ).some((diagnostic) => diagnostic.rule === "graphql/boolean-name"),
  );
  for (const prefix of ["getItems", "fetchItems"]) {
    assert.ok(
      checkGraphqlSchema(valid.replace("items(", `${prefix}(`)).some(
        (diagnostic) => diagnostic.rule === "graphql/query-name",
      ),
    );
  }

  const customRoot = valid
    .replace(
      "type Query",
      'schema { query: Reads mutation: Mutation }\n"Read operations." type Reads',
    )
    .replace("items(", "getItems(");

  assert.ok(
    checkGraphqlSchema(customRoot).some(
      (diagnostic) => diagnostic.rule === "graphql/query-name",
    ),
  );
  assert.deepEqual(
    checkGraphqlSchema(valid.replace("items(", "getawayItems(")),
    [],
  );
});
