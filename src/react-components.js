const componentRules = {
  "react-components/const-component": "error",
  "react-components/one-component-per-file": "error",
};

/** Inspect authored component definitions without treating hooks or render callbacks as components.
 * @param context - Oxlint-compatible context with the source AST and reporter.
 * @returns Visitors shared by the component declaration and file ownership rules.
 */
function components(context) {
  const candidates = new Map();

  const used = new Set();

  const reactImports = new Map();

  /** Resolve React factory calls, including imported aliases and namespace members.
   * @param node - Callee expression.
   * @returns The canonical React factory name, when known.
   */
  function factory(node) {
    if (node?.type === "Identifier") return reactImports.get(node.name);
    if (
      node?.type === "MemberExpression" &&
      reactImports.get(node.object.name) === "*"
    )
      return node.computed ? node.property.value : node.property.name;
    return undefined;
  }

  /** Determine whether an expression is recognizably renderable React output.
   * @param node - Returned expression or type annotation.
   * @returns Whether it establishes a React component rather than an ordinary utility.
   */
  function renderable(node) {
    if (!node) return false;
    if (["JSXElement", "JSXFragment"].includes(node.type)) return true;
    if (node.type === "Literal") return node.value === null;
    if (node.type === "Identifier") return node.name === "children";
    if (node.type === "CallExpression")
      return factory(node.callee) === "createElement";
    if (node.type === "MemberExpression")
      return (node.property.name ?? node.property.value) === "children";
    if (node.type === "ConditionalExpression")
      return renderable(node.consequent) || renderable(node.alternate);
    if (node.type === "LogicalExpression")
      return renderable(node.left) || renderable(node.right);
    if (node.type === "ArrayExpression") return node.elements.some(renderable);
    if (
      [
        "AwaitExpression",
        "TSAsExpression",
        "TSNonNullExpression",
        "TSSatisfiesExpression",
      ].includes(node.type)
    )
      return renderable(node.expression ?? node.argument);
    return false;
  }

  /** Inspect only a function's own returns, never a nested render callback's returns.
   * @param node - Function body or descendant syntax node.
   * @returns Whether this function returns recognizable React output.
   */
  function returnsUI(node) {
    if (!node) return false;
    if (node.type === "ReturnStatement") return renderable(node.argument);
    if (/Function/u.test(node.type)) return false;
    return Object.entries(node).some(([key, value]) => {
      if (["comments", "loc", "parent", "range", "tokens"].includes(key))
        return false;
      return Array.isArray(value)
        ? value.some((child) => child?.type && returnsUI(child))
        : value?.type && returnsUI(value);
    });
  }

  /** Associate a function with its declared binding, including memo and forwardRef wrappers.
   * @param node - Function syntax node.
   * @returns Its owning definition and display name, if statically available.
   */
  function binding(node) {
    let owner = node;

    while (
      [
        "TSAsExpression",
        "TSNonNullExpression",
        "TSSatisfiesExpression",
      ].includes(owner.parent?.type) ||
      (owner.parent?.type === "CallExpression" &&
        ["forwardRef", "memo"].includes(factory(owner.parent.callee)))
    )
      owner = owner.parent;
    if (owner.parent?.type === "VariableDeclarator")
      return { name: owner.parent.id.name, owner: owner.parent };
    if (owner.parent?.type === "Property")
      return {
        name: owner.parent.key.name ?? owner.parent.key.value,
        owner: owner.parent,
      };
    if (node.type === "FunctionDeclaration")
      return { name: node.id?.name, owner: node };
    if (owner.parent?.type === "ExportDefaultDeclaration")
      return { name: undefined, owner };
    return undefined;
  }

  /** Record possible components while leaving lowercase utilities and callbacks alone.
   * @param node - Authored function.
   */
  function inspect(node) {
    const bound = binding(node);

    if (!bound || (bound.name && !/^[A-Z]/u.test(bound.name))) return;

    const output =
      node.body?.type === "BlockStatement"
        ? returnsUI(node.body)
        : renderable(node.body);

    const typed =
      /\b(?:ReactNode|ReactElement|FC|FunctionComponent|ComponentType|JSX\.Element)\b/u.test(
        context.sourceCode.getText(
          node.returnType ??
            bound.owner.id?.typeAnnotation ?? { range: [0, 0] },
        ),
      );

    candidates.set(bound.owner, {
      ...bound,
      node,
      output: output || typed || candidates.get(bound.owner)?.output,
    });
  }

  return {
    ArrowFunctionExpression: inspect,
    CallExpression(node) {
      const name = node.callee.name ?? node.callee.property?.name;

      if (!/^use[A-Z]/u.test(name ?? "")) return;
      for (let parent = node.parent; parent; parent = parent.parent) {
        if (!/Function/u.test(parent.type)) continue;

        const bound = binding(parent);

        const candidate = bound && candidates.get(bound.owner);

        if (candidate) candidate.output = true;
        return;
      }
    },
    ClassDeclaration(node) {
      if (["Component", "PureComponent"].includes(factory(node.superClass)))
        candidates.set(node, {
          name: node.id?.name,
          node,
          output: true,
          owner: node,
        });
    },
    ClassExpression(node) {
      if (["Component", "PureComponent"].includes(factory(node.superClass))) {
        const bound = binding(node);

        candidates.set(bound?.owner ?? node, {
          ...bound,
          node,
          output: true,
          owner: bound?.owner ?? node,
        });
      }
    },
    FunctionDeclaration: inspect,
    FunctionExpression: inspect,
    ImportDeclaration(node) {
      if (node.source.value !== "react") return;
      for (const specifier of node.specifiers)
        reactImports.set(
          specifier.local.name,
          specifier.type === "ImportSpecifier" ? specifier.imported.name : "*",
        );
    },
    JSXOpeningElement(node) {
      if (node.name.type === "JSXIdentifier") used.add(node.name.name);
    },
    "Program:exit"() {
      const definitions = [...candidates.values()].filter(
        (candidate) => candidate.output || used.has(candidate.name),
      );

      if (context.id.endsWith("one-component-per-file")) {
        for (const definition of definitions.slice(1))
          context.report({
            data: { name: definition.name ?? "default export" },
            messageId: "multiple",
            node: definition.owner,
          });
        return;
      }
      for (const definition of definitions) {
        const valid =
          definition.owner.type === "VariableDeclarator" &&
          definition.owner.parent.kind === "const" &&
          !["ClassExpression", "FunctionExpression"].includes(
            definition.node.type,
          );

        if (!valid)
          context.report({
            data: { name: definition.name ?? "default export" },
            messageId: "constant",
            node: definition.owner,
          });
      }
    },
    VariableDeclarator(node) {
      if (!/^[A-Z]/u.test(node.id.name ?? "")) return;

      let expression = node.init;

      while (
        ["TSAsExpression", "TSSatisfiesExpression"].includes(expression?.type)
      )
        expression = expression.expression;
      if (
        expression?.type === "CallExpression" &&
        ["forwardRef", "lazy", "memo"].includes(factory(expression.callee))
      )
        candidates.set(node, {
          name: node.id.name,
          node: expression,
          output: true,
          owner: node,
        });
    },
  };
}

export { componentRules };

export default {
  rules: {
    "const-component": {
      create: components,
      meta: {
        docs: {
          description:
            "Define React components with const arrow functions, not function declarations or expressions.",
        },
        messages: {
          constant:
            "Define React component {{name}} as a const arrow function. Ordinary utilities and hooks may still use function declarations.",
        },
        schema: [],
        type: "suggestion",
      },
    },
    "one-component-per-file": {
      create: components,
      meta: {
        docs: {
          description:
            "Define at most one React component per file, including private and nested components.",
        },
        messages: {
          multiple:
            "Move React component {{name}} into its own file. Re-export compound parts from a definition-free barrel when needed.",
        },
        schema: [],
        type: "suggestion",
      },
    },
  },
};
