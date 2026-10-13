import jsdoc from "eslint-plugin-jsdoc";

// Follow module exports through aliases and object/class members, never into
// function bodies or arbitrary calls such as array.map(callback).
function publicImplementations(program) {
  const bindings = new Map();

  const implementations = new Set();

  const visited = new Set();

  // Destructuring stores a selected path rather than exposing the whole initializer.
  function bindPattern(pattern, value) {
    if (pattern.type === "Identifier") {
      bindings.set(pattern.name, value);
    } else if (pattern.type === "AssignmentPattern") {
      bindPattern(pattern.left, {
        left: value,
        right: pattern.right,
        type: "LogicalExpression",
      });
    } else if (pattern.type === "RestElement") {
      // Rest bindings shadow runtime globals, but their remaining API is unknown.
      bindPattern(pattern.argument, undefined);
    } else if (pattern.type === "ObjectPattern") {
      for (const property of pattern.properties) {
        if (property.type === "RestElement") {
          bindPattern(property, undefined);
          continue;
        }
        if (property.type !== "Property") continue;

        const key = propertyKey(property);

        if (key !== undefined)
          bindPattern(property.value, {
            key,
            object: value,
            type: "StaticSelection",
          });
      }
    } else if (pattern.type === "ArrayPattern") {
      for (const [index, item] of pattern.elements.entries()) {
        if (item)
          bindPattern(item, {
            key: String(index),
            object: value,
            type: "StaticSelection",
          });
      }
    }
  }

  function bind(declaration) {
    if (!declaration || declaration.declare) return;
    if (declaration.type === "VariableDeclaration") {
      for (const item of declaration.declarations)
        bindPattern(item.id, item.init);
    } else if (
      (declaration.type === "FunctionDeclaration" ||
        declaration.type === "ClassDeclaration") &&
      declaration.id?.type === "Identifier"
    ) {
      bindings.set(declaration.id.name, declaration);
    } else if (
      declaration.type === "ImportDeclaration" &&
      declaration.importKind !== "type"
    ) {
      for (const specifier of declaration.specifiers) {
        if (specifier.importKind !== "type")
          bindings.set(specifier.local.name, undefined);
      }
    }
  }

  function propertyKey(node) {
    const key = node.type === "MemberExpression" ? node.property : node.key;

    if (!node.computed && key?.type === "Identifier") return key.name;
    if (
      key?.type === "Literal" &&
      ["number", "string"].includes(typeof key.value)
    )
      return String(key.value);
    return undefined;
  }

  // Resolve known own properties without evaluating getters, calls, or bodies.
  function select(node, key, seen = new Map()) {
    if (!node) return [];

    const keys = seen.get(node) ?? new Set();

    if (keys.has(key)) return [];
    keys.add(key);
    seen.set(node, keys);
    switch (node.type) {
      case "ArrayExpression":
        return /^\d+$/.test(key) && node.elements[Number(key)]
          ? [node.elements[Number(key)]]
          : [];
      case "ClassDeclaration":
      case "ClassExpression":
        return node.body.body
          .filter(
            (member) =>
              member.static &&
              member.accessibility !== "private" &&
              member.accessibility !== "protected" &&
              member.key?.type !== "PrivateIdentifier" &&
              member.kind !== "get" &&
              member.kind !== "set" &&
              propertyKey(member) === key,
          )
          .map((member) => member.value);
      case "ConditionalExpression":
        return [
          ...select(node.consequent, key, seen),
          ...select(node.alternate, key, seen),
        ];
      case "Identifier":
        return select(bindings.get(node.name), key, seen);
      case "LogicalExpression":
        return [
          ...select(node.left, key, seen),
          ...select(node.right, key, seen),
        ];
      case "MemberExpression": {
        const selectedKey = propertyKey(node);

        return selectedKey === undefined
          ? []
          : select(node.object, selectedKey, seen).flatMap((value) =>
              select(value, key, seen),
            );
      }
      case "ObjectExpression":
        for (const property of [...node.properties].reverse()) {
          if (property.type === "SpreadElement") {
            const values = select(property.argument, key, seen);

            if (values.length) return values;
          } else if (propertyKey(property) === key) {
            return property.kind === "get" || property.kind === "set"
              ? []
              : [property.value];
          }
        }
        return [];
      case "ParenthesizedExpression":
      case "TSAsExpression":
      case "TSNonNullExpression":
      case "TSSatisfiesExpression":
      case "TSTypeAssertion":
        return select(node.expression, key, seen);
      case "StaticSelection":
        return select(node.object, node.key, seen).flatMap((value) =>
          select(value, key, seen),
        );
      default:
        return [];
    }
  }

  function visitPattern(pattern) {
    if (pattern.type === "Identifier") visit(bindings.get(pattern.name));
    else if (pattern.type === "AssignmentPattern") visitPattern(pattern.left);
    else if (pattern.type === "ObjectPattern") {
      for (const property of pattern.properties)
        if (property.type === "Property") visitPattern(property.value);
    } else if (pattern.type === "ArrayPattern") {
      for (const item of pattern.elements)
        if (item && item.type !== "RestElement") visitPattern(item);
    }
  }

  function visit(node) {
    if (!node || visited.has(node)) return;
    visited.add(node);
    switch (node.type) {
      case "ArrowFunctionExpression":
      case "FunctionDeclaration":
      case "FunctionExpression":
        implementations.add(node);
        break;
      case "ClassDeclaration":
      case "ClassExpression":
        for (const member of node.body.body) {
          if (
            member.accessibility !== "private" &&
            member.accessibility !== "protected" &&
            member.key?.type !== "PrivateIdentifier"
          ) {
            visit(member.value);
          }
        }
        break;
      case "ConditionalExpression":
        visit(node.consequent);
        visit(node.alternate);
        break;
      case "Identifier":
        visit(bindings.get(node.name));
        break;
      case "LogicalExpression":
        visit(node.left);
        visit(node.right);
        break;
      case "MemberExpression": {
        const key = propertyKey(node);

        if (key !== undefined)
          for (const value of select(node.object, key)) visit(value);
        break;
      }
      case "ObjectExpression":
        for (const property of node.properties) {
          visit(
            property.type === "SpreadElement"
              ? property.argument
              : property.value,
          );
        }
        break;
      case "ParenthesizedExpression":
      case "TSAsExpression":
      case "TSNonNullExpression":
      case "TSSatisfiesExpression":
      case "TSTypeAssertion":
        visit(node.expression);
        break;
      case "StaticSelection":
        for (const value of select(node.object, node.key)) visit(value);
        break;
      case "VariableDeclaration":
        for (const item of node.declarations) visitPattern(item.id);
        break;
    }
  }

  function isCommonJsExport(node) {
    if (node?.type !== "MemberExpression") return false;
    if (
      node.object.type === "Identifier" &&
      node.object.name === "exports" &&
      !bindings.has("exports")
    )
      return true;
    if (
      node.object.type === "Identifier" &&
      node.object.name === "module" &&
      !bindings.has("module") &&
      ((!node.computed && node.property.name === "exports") ||
        (node.computed && node.property.value === "exports"))
    )
      return true;
    return isCommonJsExport(node.object);
  }

  for (const statement of program.body) {
    bind(statement.declaration ?? statement);
    if (
      statement.type === "ExpressionStatement" &&
      statement.expression.type === "AssignmentExpression" &&
      statement.expression.operator === "=" &&
      statement.expression.left.type === "Identifier"
    )
      bindings.set(statement.expression.left.name, statement.expression.right);
  }
  for (const statement of program.body) {
    if (statement.type === "ExportDefaultDeclaration") {
      visit(statement.declaration);
    } else if (
      statement.type === "ExportNamedDeclaration" &&
      !statement.source
    ) {
      visit(statement.declaration);
      for (const specifier of statement.specifiers) {
        if (statement.exportKind !== "type" && specifier.exportKind !== "type")
          visit(specifier.local);
      }
    } else if (
      statement.type === "ExpressionStatement" &&
      statement.expression.type === "AssignmentExpression" &&
      isCommonJsExport(statement.expression.left)
    ) {
      visit(statement.expression.right);
    }
  }
  return implementations;
}

const requireJsdoc = jsdoc.rules["require-jsdoc"];

export default {
  ...jsdoc,
  rules: {
    ...jsdoc.rules,
    "require-jsdoc": {
      ...requireJsdoc,

      /** Limit upstream missing-doc reports to implementations exposed by module exports.
       * @param context - Oxlint rule context with the parsed module and diagnostic reporter.
       * @returns Upstream JSDoc visitors using a public-implementation report filter.
       */
      create(context) {
        const exposed = publicImplementations(context.sourceCode.ast);

        const guarded = Object.create(context, {
          report: {
            value(descriptor) {
              if (exposed.has(descriptor.node)) context.report(descriptor);
            },
          },
        });

        return requireJsdoc.create(guarded);
      },
    },
  },
};
