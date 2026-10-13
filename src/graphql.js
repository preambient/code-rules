import {
  buildASTSchema,
  getLocation,
  Kind,
  parse,
  Source,
  validateSchema,
  visit,
} from "graphql";

const pascalCase = /^[A-Z][A-Za-z0-9]*$/;

const camelCase = /^[a-z][A-Za-z0-9]*$/;

const enumCase = /^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*$/;

const mutationVerb =
  /^(?:accept|add|archive|assign|attach|cancel|clear|complete|confirm|connect|create|delete|detach|disable|disconnect|dismiss|enable|grant|invite|join|leave|link|move|publish|refresh|reject|remove|rename|replace|reset|restore|retry|revoke|rotate|save|send|set|start|stop|submit|sync|unarchive|unlink|unpublish|update|upsert|verify)[A-Z]/;

const documentedKinds = new Set([
  Kind.DIRECTIVE_DEFINITION,
  Kind.ENUM_TYPE_DEFINITION,
  Kind.ENUM_VALUE_DEFINITION,
  Kind.FIELD_DEFINITION,
  Kind.INPUT_OBJECT_TYPE_DEFINITION,
  Kind.INPUT_VALUE_DEFINITION,
  Kind.INTERFACE_TYPE_DEFINITION,
  Kind.OBJECT_TYPE_DEFINITION,
  Kind.SCALAR_TYPE_DEFINITION,
  Kind.UNION_TYPE_DEFINITION,
]);

const typeKinds = new Set([
  Kind.ENUM_TYPE_DEFINITION,
  Kind.ENUM_TYPE_EXTENSION,
  Kind.INPUT_OBJECT_TYPE_DEFINITION,
  Kind.INPUT_OBJECT_TYPE_EXTENSION,
  Kind.INTERFACE_TYPE_DEFINITION,
  Kind.INTERFACE_TYPE_EXTENSION,
  Kind.OBJECT_TYPE_DEFINITION,
  Kind.OBJECT_TYPE_EXTENSION,
  Kind.SCALAR_TYPE_DEFINITION,
  Kind.SCALAR_TYPE_EXTENSION,
  Kind.UNION_TYPE_DEFINITION,
  Kind.UNION_TYPE_EXTENSION,
]);

/**
 * Validate a complete SDL schema against the versioned GraphQL naming and documentation policy.
 * Diagnostics include parse and schema errors; invalid input does not throw.
 * Runtime authorization, pagination behavior, and operation compatibility remain consumer checks.
 * @param source - Complete GraphQL schema definition language text, including extensions.
 * @param sourceName - File or schema label included in every diagnostic.
 * @returns Policy and schema diagnostics with one-based source locations when available.
 */
export function checkGraphqlSchema(source, sourceName = "schema.graphql") {
  const diagnostics = [];

  const report = (rule, message, node) => {
    const location = node?.loc
      ? getLocation(node.loc.source, node.loc.start)
      : {};

    diagnostics.push({
      column: location.column ?? 1,
      line: location.line ?? 1,
      message,
      rule,
      sourceName,
    });
  };

  let document;

  try {
    document = parse(new Source(source, sourceName));
  } catch (error) {
    return [
      {
        column: error.locations?.[0]?.column ?? 1,
        line: error.locations?.[0]?.line ?? 1,
        message: error.message,
        rule: "graphql/syntax",
        sourceName,
      },
    ];
  }

  try {
    for (const error of validateSchema(buildASTSchema(document))) {
      report("graphql/schema", error.message, error.nodes?.[0]);
    }
  } catch (error) {
    report("graphql/schema", error.message, error.nodes?.[0]);
  }

  const hasExplicitSchema = document.definitions.some(
    (definition) => definition.kind === Kind.SCHEMA_DEFINITION,
  );

  const mutationRoots = new Set(hasExplicitSchema ? [] : ["Mutation"]);

  const queryRoots = new Set(hasExplicitSchema ? [] : ["Query"]);

  const definitions = new Map(
    document.definitions
      .filter(
        (definition) =>
          typeKinds.has(definition.kind) &&
          !definition.kind.endsWith("Extension"),
      )
      .map((definition) => [definition.name.value, definition]),
  );

  for (const definition of document.definitions) {
    for (const operation of definition.operationTypes ?? []) {
      if (operation.operation === "mutation")
        mutationRoots.add(operation.type.name.value);
      if (operation.operation === "query")
        queryRoots.add(operation.type.name.value);
    }
  }

  visit(document, {
    enter(node, _key, _parent, _path, ancestors) {
      const name = node.name?.value;

      if (
        documentedKinds.has(node.kind) &&
        !meaningful(node.description?.value)
      ) {
        report(
          "graphql/description",
          `${name} needs a meaningful description.`,
          node,
        );
      }
      if (typeKinds.has(node.kind) && !pascalCase.test(name)) {
        report("graphql/type-name", `${name} must use PascalCase.`, node);
      }
      if (
        [
          Kind.DIRECTIVE_DEFINITION,
          Kind.FIELD_DEFINITION,
          Kind.INPUT_VALUE_DEFINITION,
        ].includes(node.kind) &&
        !camelCase.test(name)
      ) {
        report("graphql/field-name", `${name} must use camelCase.`, node);
      }
      if (
        (node.kind === Kind.FIELD_DEFINITION ||
          (node.kind === Kind.INPUT_VALUE_DEFINITION &&
            ancestors.some((ancestor) =>
              [
                Kind.INPUT_OBJECT_TYPE_DEFINITION,
                Kind.INPUT_OBJECT_TYPE_EXTENSION,
              ].includes(ancestor.kind),
            ))) &&
        namedType(node.type) === "Boolean" &&
        !/^(?:is|has|can)[A-Z]/.test(name)
      ) {
        report(
          "graphql/boolean-name",
          `${name} must start with is, has, or can followed by a capitalized name.`,
          node,
        );
      }
      if (node.kind === Kind.ENUM_VALUE_DEFINITION && !enumCase.test(name)) {
        report(
          "graphql/enum-value",
          `${name} must use UPPER_SNAKE_CASE.`,
          node,
        );
      }
      if (
        [
          Kind.INPUT_OBJECT_TYPE_DEFINITION,
          Kind.INPUT_OBJECT_TYPE_EXTENSION,
        ].includes(node.kind) &&
        !name.endsWith("Input")
      ) {
        report("graphql/input-name", `${name} must end in Input.`, node);
      }
      for (const directive of node.directives ?? []) {
        if (directive.name.value !== "deprecated") continue;

        const reason = directive.arguments?.find(
          (argument) => argument.name.value === "reason",
        )?.value;

        if (reason?.kind !== Kind.STRING || !meaningful(reason.value)) {
          report(
            "graphql/deprecation-reason",
            `${name} needs an explicit, meaningful deprecation reason.`,
            directive,
          );
        }
      }
      if (
        ![Kind.OBJECT_TYPE_DEFINITION, Kind.OBJECT_TYPE_EXTENSION].includes(
          node.kind,
        )
      )
        return;
      if (queryRoots.has(name)) {
        for (const field of node.fields ?? []) {
          if (/^(?:get|fetch)(?:[A-Z]|$)/.test(field.name.value)) {
            report(
              "graphql/query-name",
              `${field.name.value} must name the requested data without a get or fetch prefix.`,
              field,
            );
          }
        }
      }
      if (mutationRoots.has(name)) {
        for (const field of node.fields ?? []) {
          const mutation = field.name.value;

          const prefix = mutation[0].toUpperCase() + mutation.slice(1);

          const [input] = field.arguments ?? [];

          if (!mutationVerb.test(mutation)) {
            report(
              "graphql/mutation-name",
              `${mutation} must start with an action verb (for example create, update, or delete).`,
              field,
            );
          }
          if (
            field.arguments?.length !== 1 ||
            input?.name.value !== "input" ||
            input.type.kind !== Kind.NON_NULL_TYPE ||
            input.type.type.kind !== Kind.NAMED_TYPE ||
            namedType(input.type) !== `${prefix}Input` ||
            definitions.get(`${prefix}Input`)?.kind !==
              Kind.INPUT_OBJECT_TYPE_DEFINITION
          ) {
            report(
              "graphql/mutation-input",
              `${mutation} must accept exactly input: ${prefix}Input!.`,
              field,
            );
          }
          if (
            namedType(field.type) !== `${prefix}Payload` ||
            field.type.kind === Kind.LIST_TYPE ||
            field.type.type?.kind === Kind.LIST_TYPE ||
            definitions.get(`${prefix}Payload`)?.kind !==
              Kind.OBJECT_TYPE_DEFINITION
          ) {
            report(
              "graphql/mutation-payload",
              `${mutation} must return ${prefix}Payload.`,
              field,
            );
          }
        }
      }
    },
  });

  // Merge extension fields before checking structural conventions.
  const objects = new Map();

  for (const definition of document.definitions) {
    if (
      ![Kind.OBJECT_TYPE_DEFINITION, Kind.OBJECT_TYPE_EXTENSION].includes(
        definition.kind,
      )
    )
      continue;

    const entry = objects.get(definition.name.value) ?? {
      fields: [],
      node: definition,
    };

    entry.fields.push(...(definition.fields ?? []));
    objects.set(definition.name.value, entry);
  }
  for (const [name, { fields, node }] of objects) {
    if (!name.endsWith("Connection")) continue;

    const nodes = fields.find((field) => field.name.value === "nodes");

    const pageInfo = fields.find((field) => field.name.value === "pageInfo");

    if (
      !nodes ||
      nodes.type.kind !== Kind.NON_NULL_TYPE ||
      nodes.type.type.kind !== Kind.LIST_TYPE ||
      nodes.type.type.type.kind !== Kind.NON_NULL_TYPE ||
      nodes.type.type.type.type.kind !== Kind.NAMED_TYPE
    ) {
      report(
        "graphql/connection-nodes",
        `${name} must expose nodes as a non-null list of non-null items.`,
        nodes ?? node,
      );
    }
    if (
      !pageInfo ||
      pageInfo.type.kind !== Kind.NON_NULL_TYPE ||
      pageInfo.type.type.kind !== Kind.NAMED_TYPE ||
      namedType(pageInfo.type) !== "PageInfo"
    ) {
      report(
        "graphql/connection-page-info",
        `${name} must expose pageInfo: PageInfo!.`,
        pageInfo ?? node,
      );
    }
  }
  return diagnostics;
}

function meaningful(value) {
  return (
    Boolean(value?.trim()) &&
    !/^(?:todo|tbd|fixme|description)[.!\s]*$/i.test(value.trim())
  );
}

function namedType(type) {
  return type.kind === Kind.NAMED_TYPE ? type.name.value : namedType(type.type);
}
