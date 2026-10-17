// This registry is intentionally files and exports, never a components-directory exemption.
const primitiveModules = {
  "atoms/avatar": ["AvatarFallback", "AvatarGroupCount"],
  "atoms/badge": ["Badge"],
  "atoms/button": ["Button"],
  "atoms/checkbox": [],
  "atoms/input": [],
  "atoms/kbd": ["Kbd"],
  "atoms/label": ["Label"],
  "atoms/loading-indicator": [],
  "atoms/native-select": ["NativeSelectOption", "NativeSelectOptGroup"],
  "atoms/progress": ["ProgressLabel", "ProgressValue"],
  "atoms/select": ["SelectItem", "SelectLabel", "SelectValue"],
  "atoms/separator": [],
  "atoms/textarea": [],
  "atoms/toggle": ["Toggle"],
  "atoms/typography": ["Typography"],
  "molecules/button-group": ["ButtonGroupText"],
  "molecules/field": [
    "FieldDescription",
    "FieldError",
    "FieldLabel",
    "FieldLegend",
    "FieldSeparator",
    "FieldTitle",
  ],
  "molecules/input-group": ["InputGroupButton", "InputGroupText"],
  "molecules/marker": ["MarkerContent"],
  "molecules/pagination": [
    "PaginationLink",
    "PaginationNext",
    "PaginationPrevious",
  ],
  "molecules/radio-group": [],
  "organisms/alert-dialog": [
    "AlertDialogAction",
    "AlertDialogCancel",
    "AlertDialogDescription",
    "AlertDialogTitle",
    "AlertDialogTrigger",
  ],
  "organisms/questionnaire": [
    "QuestionnaireChoice",
    "QuestionnaireChoiceDescription",
    "QuestionnaireDescription",
    "QuestionnaireError",
    "QuestionnaireNext",
    "QuestionnairePrevious",
    "QuestionnaireSkip",
    "QuestionnaireSubmit",
    "QuestionnaireTitle",
  ],
  "organisms/sheet": [
    "SheetClose",
    "SheetDescription",
    "SheetTitle",
    "SheetTrigger",
  ],
  "organisms/toast": [
    "ToastAction",
    "ToastClose",
    "ToastDescription",
    "ToastTitle",
  ],
};

const primitiveFiles = Object.keys(primitiveModules).map(
  (name) => `frontend/packages/ui/src/components/${name}.tsx`,
);

const documentFiles = ["frontend/packages/ui/.storybook/overview-document.tsx"];

const textTags = new Set([
  "a",
  "abbr",
  "b",
  "blockquote",
  "caption",
  "code",
  "dd",
  "del",
  "dt",
  "em",
  "figcaption",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "kbd",
  "label",
  "li",
  "mark",
  "p",
  "pre",
  "s",
  "small",
  "strong",
  "sub",
  "sup",
  "td",
  "th",
]);

const controls = new Set(["button", "input", "select", "textarea"]);

const typographyClass =
  /^(?:text-|font-|leading-|tracking-|decoration-|underline|overline|line-through|no-underline|italic|not-italic|uppercase|lowercase|capitalize|normal-case|antialiased|subpixel-antialiased|prose(?:-|$))/u;

const placementClass =
  /^(?:(?:-?m[trblxyse]?|w|min-w|max-w|inset(?:-[xy])?|top|bottom|left|right|start|end|z|order|col|row|basis|self|justify-self|place-self|gap|gap-x|gap-y|grid-cols|grid-rows|col-span|row-span)-|(?:block|inline|inline-block|flex|inline-flex|grid|inline-grid|hidden|contents|relative|absolute|fixed|sticky|static|grow|shrink|flex-1|flex-auto|flex-none|flex-col|flex-row|flex-wrap|items-start|items-center|items-end|justify-start|justify-center|justify-end|justify-between)$)/u;

/** Build the UI AST visitors used by the Preambient preset.
 * @param context - Oxlint-compatible ESLint context.
 * @returns Visitors that enforce text ownership and canonical component contracts.
 */
function create(context) {
  const imports = new Map();

  const aliases = new Map();

  const types = new Map();

  const slots = new WeakMap();

  const source = context.sourceCode;

  /** Resolve imported identifiers and simple aliases, including namespace members.
   * @param node - JSX name or expression.
   * @param seen - Names already expanded during alias resolution.
   * @returns Canonical import identity when statically resolvable.
   */
  function identity(node, seen = new Set()) {
    if (!node) return undefined;
    if (node.type === "JSXIdentifier" || node.type === "Identifier") {
      if (seen.has(node.name)) return undefined;
      seen.add(node.name);
      for (let scope = source.getScope?.(node); scope; scope = scope.upper) {
        const variable = scope.set?.get(node.name);

        if (!variable) continue;

        const definition = variable.defs?.[0];

        if (definition?.type === "ImportBinding") {
          const specifier = definition.node;

          return {
            module: definition.parent.source.value,
            name:
              specifier.imported?.name ??
              (specifier.type === "ImportNamespaceSpecifier" ? "*" : "default"),
          };
        }
        if (
          definition?.type === "Variable" &&
          definition.node.id.type === "Identifier"
        )
          return identity(definition.node.init, seen);
        return undefined;
      }
      return imports.get(node.name) ?? identity(aliases.get(node.name), seen);
    }
    if (["JSXMemberExpression", "MemberExpression"].includes(node.type)) {
      const parent = identity(node.object, seen);

      if (!parent) return undefined;

      const member = node.property.name ?? node.property.value;

      return {
        ...parent,
        name: parent.name === "*" ? member : `${parent.name}.${member}`,
      };
    }
    return undefined;
  }

  /** Inspect static class expressions, following constants and conditional branches.
   * @param node - Attribute value or nested expression.
   * @param seen - Nodes already visited while expanding constants.
   * @returns Static class tokens, including aliases used on native layout elements.
   */
  function classTokens(node, seen = new Set()) {
    if (!node || seen.has(node)) return [];
    seen.add(node);
    if (node.type === "Literal")
      return typeof node.value === "string" ? node.value.split(/\s+/u) : [];
    if (node.type === "Identifier") {
      for (let scope = source.getScope?.(node); scope; scope = scope.upper) {
        const variable = scope.set?.get(node.name);

        if (variable) return classTokens(variable.defs?.[0]?.node?.init, seen);
      }
      return classTokens(aliases.get(node.name), seen);
    }
    if (node.type === "TemplateLiteral")
      return [
        ...node.quasis.flatMap((part) => part.value.cooked.split(/\s+/u)),
        ...node.expressions.flatMap((expression) =>
          classTokens(expression, seen),
        ),
      ];
    if (node.type === "Property")
      return [...classTokens(node.key, seen), ...classTokens(node.value, seen)];
    return Object.entries(node)
      .filter(
        ([key]) => !["callee", "loc", "parent", "range", "test"].includes(key),
      )
      .flatMap(([, value]) =>
        Array.isArray(value)
          ? value.flatMap((child) =>
              child?.type ? classTokens(child, seen) : [],
            )
          : value?.type
            ? classTokens(value, seen)
            : [],
      );
  }

  /** Decide whether an import is a registered shared UI export.
   * @param info - Resolved import identity.
   * @returns Whether it belongs to the canonical UI package.
   */
  function shared(info) {
    return info?.module.startsWith("@repo/ui/components/");
  }

  /** Determine if this JSX element owns the text of its descendants.
   * @param node - JSX element.
   * @returns Whether the element is Typography or a registered text-owning part.
   */
  function owner(node) {
    const info = identity(node.openingElement.name);

    if (!shared(info)) return false;

    const module = info.module.slice("@repo/ui/components/".length);

    if (module === "atoms/typography")
      return /^Typography\.(?:a|blockquote|code|dd|dl|dt|em|h[1-6]|li|ol|p|pre|small|span|srOnly|strong|ul)$/u.test(
        info.name,
      );
    return primitiveModules[module]?.includes(info.name) ?? false;
  }

  /** Find an owning text element without crossing an unregistered component boundary.
   * @param node - Text node or expression container.
   * @returns Whether text is already inside a registered owner.
   */
  function owned(node) {
    for (let parent = node.parent; parent; parent = parent.parent) {
      if (parent.type !== "JSXElement") continue;
      if (owner(parent)) return true;

      const name = parent.openingElement.name;

      if (name.type !== "JSXIdentifier" || /^[A-Z]/u.test(name.name))
        return false;
    }
    return false;
  }

  /** Resolve names of explicitly declared ReactNode slots in a props type.
   * @param annotation - Type syntax to inspect.
   * @param visited - Type aliases already expanded.
   * @returns Names of renderable slots in this type.
   */
  function slotNames(annotation, visited = new Set()) {
    if (!annotation) return [];
    if (annotation.type === "TSTypeAnnotation")
      return slotNames(annotation.typeAnnotation, visited);
    if (annotation.type === "TSIntersectionType")
      return annotation.types.flatMap((type) => slotNames(type, visited));
    if (annotation.type === "TSTypeReference") {
      const name = source.getText(annotation.typeName);

      if (name === "Readonly")
        return (
          annotation.typeArguments?.params ??
          annotation.typeParameters?.params ??
          []
        ).flatMap((type) => slotNames(type, visited));
      if (name === "PropsWithChildren" || name === "React.PropsWithChildren")
        return [
          "children",
          ...(
            annotation.typeArguments?.params ??
            annotation.typeParameters?.params ??
            []
          ).flatMap((type) => slotNames(type, visited)),
        ];
      if (visited.has(name)) return [];
      visited.add(name);
      return slotNames(types.get(name), visited);
    }
    if (annotation.type === "TSTypeLiteral")
      return annotation.members
        .filter(
          (member) =>
            member.type === "TSPropertySignature" &&
            /^(?:React\.)?ReactNode(?:\s*\|\s*(?:null|undefined))?$/u.test(
              source.getText(member.typeAnnotation?.typeAnnotation ?? member),
            ),
        )
        .map((member) => member.key.name ?? member.key.value);
    return [];
  }

  /** Record forwarding slots only for the function whose props declare them.
   * @param node - Function with typed props.
   */
  function recordSlots(node) {
    const allowed = new Set();

    for (const parameter of node.params) {
      const names = slotNames(parameter.typeAnnotation);

      if (parameter.type === "ObjectPattern") {
        for (const property of parameter.properties)
          if (names.includes(property.key?.name))
            allowed.add(property.value.name ?? property.value.left?.name);
      } else if (parameter.type === "Identifier") {
        for (const name of names) allowed.add(`${parameter.name}.${name}`);
      }
    }
    slots.set(node, allowed);
  }

  /** Check whether an expression produces elements or forwards a declared ReactNode slot.
   * @param node - Expression rendered as a child.
   * @returns Whether it has a known text-free or component-owned rendering contract.
   */
  function safe(node) {
    if (!node) return true;
    if (["JSXElement", "JSXEmptyExpression", "JSXFragment"].includes(node.type))
      return true;
    if (node.type === "Literal")
      return node.value === null || typeof node.value === "boolean";
    if (node.type === "ConditionalExpression")
      return safe(node.consequent) && safe(node.alternate);
    if (node.type === "LogicalExpression")
      return (node.operator === "&&" || safe(node.left)) && safe(node.right);
    if (node.type === "ArrayExpression") return node.elements.every(safe);
    if (
      ["ChainExpression", "TSAsExpression", "TSNonNullExpression"].includes(
        node.type,
      )
    )
      return safe(node.expression);
    if (
      node.type === "CallExpression" &&
      node.callee.type === "MemberExpression" &&
      node.callee.property.name === "map"
    ) {
      const callback = node.arguments[0];

      if (
        callback?.type === "ArrowFunctionExpression" &&
        callback.body.type !== "BlockStatement"
      )
        return safe(callback.body);
    }

    const text = source.getText(node);

    for (let parent = node.parent; parent; parent = parent.parent)
      if (slots.has(parent)) return slots.get(parent).has(text);
    return false;
  }

  return {
    ArrowFunctionExpression: recordSlots,
    CallExpression(node) {
      const info = identity(node.callee);

      if (info?.module !== "react" || info.name !== "createElement") return;

      const tag = node.arguments[0];

      if (tag?.type === "Literal" && controls.has(tag.value))
        context.report({ messageId: "control", node });
      if (tag?.type === "Literal" && textTags.has(tag.value))
        context.report({ messageId: "text", node });

      const target = identity(tag);

      const module = target?.module.slice("@repo/ui/components/".length);

      const owner =
        shared(target) &&
        (primitiveModules[module]?.includes(target.name) ||
          /^Typography\./u.test(target.name));

      if (!owner && node.arguments.slice(2).some((child) => !safe(child)))
        context.report({ messageId: "text", node });
    },
    FunctionDeclaration: recordSlots,
    FunctionExpression: recordSlots,
    ImportDeclaration(node) {
      if (
        /^(?:@base-ui\/react(?:\/|$)|@radix-ui\/|@shadcn\/react(?:\/|$))/u.test(
          node.source.value,
        )
      )
        context.report({ messageId: "control", node });
      for (const specifier of node.specifiers)
        imports.set(specifier.local.name, {
          module: node.source.value,
          name:
            specifier.imported?.name ??
            (specifier.type === "ImportNamespaceSpecifier" ? "*" : "default"),
        });
    },
    JSXAttribute(node) {
      const name = node.name.name;

      if (name === "dangerouslySetInnerHTML")
        context.report({ messageId: "text", node });
      if (name === "role" && node.value?.value === "button")
        context.report({ messageId: "control", node });
      if (name === "children" && !owner(node.parent.parent)) {
        const value = node.value;

        if (
          value?.type === "Literal" ||
          (value?.type === "JSXExpressionContainer" && !safe(value.expression))
        )
          context.report({ messageId: "text", node });
      }
      if (name !== "className" && name !== "style") return;

      const info = identity(node.parent.name);

      if (name === "style") {
        context.report({ messageId: "style", node });
        return;
      }

      const classes = classTokens(node.value);

      for (const token of classes) {
        const base = utility(token);

        if (typographyClass.test(base)) {
          context.report({ messageId: "typography", node });
          break;
        }
      }
      if (
        shared(info) &&
        classes.some((token) => token && !placementClass.test(utility(token)))
      )
        context.report({ messageId: "appearance", node });
    },
    JSXElement(node) {
      const name = node.openingElement.name;

      if (name.type !== "JSXIdentifier") return;
      if (controls.has(name.name))
        context.report({ messageId: "control", node: node.openingElement });
      if (textTags.has(name.name) && !owned(node) && node.children.length > 0)
        context.report({ messageId: "text", node: node.openingElement });
    },
    JSXExpressionContainer(node) {
      if (
        !["JSXElement", "JSXFragment"].includes(node.parent.type) ||
        owned(node) ||
        safe(node.expression)
      )
        return;
      context.report({ messageId: "text", node });
    },
    JSXText(node) {
      if (node.value.trim() && !owned(node))
        context.report({ messageId: "text", node });
    },
    Program(node) {
      for (const statement of node.body) {
        const declaration = statement.declaration ?? statement;

        if (declaration.type === "TSTypeAliasDeclaration")
          types.set(declaration.id.name, declaration.typeAnnotation);
      }
    },
    Property(node) {
      if (!/(?:^|\/)stories\/|\.stories\./u.test(context.filename)) return;

      const name = node.key.name ?? node.key.value;

      if (name !== "className" && name !== "style") return;

      let inArgs = false;

      for (let parent = node.parent; parent; parent = parent.parent)
        if (
          parent.type === "Property" &&
          (parent.key.name ?? parent.key.value) === "args"
        )
          inArgs = true;
      if (!inArgs) return;
      if (name === "style") context.report({ messageId: "style", node });
      if (
        name === "className" &&
        classTokens(node.value).some(
          (token) => token && !placementClass.test(utility(token)),
        )
      )
        context.report({ messageId: "appearance", node });
    },
    TSTypeAliasDeclaration(node) {
      types.set(node.id.name, node.typeAnnotation);
    },
    VariableDeclarator(node) {
      if (node.id.type === "Identifier" && node.init)
        aliases.set(node.id.name, node.init);
    },
  };
}

/** Strip variants without confusing arbitrary selector colons with utility prefixes.
 * @param value - One complete Tailwind class token.
 * @returns The final utility portion.
 */
function utility(value) {
  return value
    .split(/:(?![^[]*\])/u)
    .at(-1)
    .replace(/^!/u, "");
}

export { documentFiles, primitiveFiles };

export default {
  rules: {
    "ui-contracts": {
      create,
      meta: {
        docs: {
          description:
            "Require shared Typography and canonical primitive appearance.",
        },
        messages: {
          appearance:
            "Use canonical variants for component appearance; className may only place or arrange a component.",
          control:
            "Use the shared UI primitive instead of recreating a native control.",
          style:
            "Inline styles bypass the shared component contract. Add a canonical variant instead.",
          text: "Render authored text with Typography.* or a registered text-owning primitive. Only typed ReactNode slots may be forwarded directly.",
          typography:
            "Text appearance belongs in Typography or a registered primitive. Use named tone/alignment/variant props.",
        },
        schema: [],
        type: "suggestion",
      },
    },
  },
};
