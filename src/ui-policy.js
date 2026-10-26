import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

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
  "atoms/skeleton": [],
  "atoms/textarea": [],
  "atoms/toggle": ["Toggle"],
  "atoms/typography": ["Typography"],
  "molecules/attachment": [
    "AttachmentAction",
    "AttachmentDescription",
    "AttachmentTitle",
    "AttachmentTrigger",
  ],
  "molecules/bubble": ["BubbleContent"],
  "molecules/button-group": ["ButtonGroupText"],
  "molecules/code-block": [
    "CodeBlockContent",
    "CodeBlockCopyButton",
    "CodeBlockTitle",
  ],
  "molecules/collapsible": ["CollapsibleTrigger"],
  "molecules/dropdown-menu": [
    "DropdownMenuCheckboxItem",
    "DropdownMenuItem",
    "DropdownMenuLabel",
    "DropdownMenuRadioItem",
    "DropdownMenuShortcut",
    "DropdownMenuSubTrigger",
    "DropdownMenuTrigger",
  ],
  "molecules/empty": ["EmptyDescription", "EmptyTitle"],
  "molecules/field": [
    "FieldDescription",
    "FieldError",
    "FieldLabel",
    "FieldLegend",
    "FieldSeparator",
    "FieldTitle",
  ],
  "molecules/hover-card": ["HoverCardTrigger"],
  "molecules/input-group": ["InputGroupButton", "InputGroupText"],
  "molecules/loading-button": ["LoadingButton"],
  "molecules/marker": ["MarkerContent"],
  "molecules/message": ["MessageFooter", "MessageHeader"],
  "molecules/pagination": [
    "PaginationLink",
    "PaginationNext",
    "PaginationPrevious",
  ],
  "molecules/popover": ["PopoverTrigger"],
  "molecules/radio-group": [],
  "molecules/table": ["TableCaption", "TableCell", "TableHead"],
  "molecules/tooltip": ["TooltipContent", "TooltipTrigger"],
  "molecules/trace": [
    "TraceCollapsibleTrigger",
    "TraceDescription",
    "TraceLine",
    "TraceTitle",
  ],
  "organisms/alert-dialog": [
    "AlertDialogAction",
    "AlertDialogCancel",
    "AlertDialogDescription",
    "AlertDialogTitle",
    "AlertDialogTrigger",
  ],
  "organisms/dialog": [
    "DialogClose",
    "DialogDescription",
    "DialogTitle",
    "DialogTrigger",
  ],
  "organisms/message-scroller": ["MessageScrollerButton"],
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
  "organisms/sidebar": [
    "SidebarGroupLabel",
    "SidebarMenuBadge",
    "SidebarMenuButton",
    "SidebarMenuSubButton",
  ],
  "organisms/toast": [
    "ToastAction",
    "ToastClose",
    "ToastDescription",
    "ToastTitle",
  ],
};

const primitiveParts = {
  "atoms/avatar": [
    "avatar-group-count",
    "avatar-fallback",
    "avatar",
    "avatar-group",
    "avatar-badge",
    "avatar-image",
  ],
  "atoms/kbd": ["kbd", "kbd-group"],
  "atoms/native-select": [
    "native-select-opt-group",
    "shared",
    "native-select",
    "native-select-option",
  ],
  "atoms/progress": [
    "progress-value",
    "progress-label",
    "progress",
    "progress-track",
    "progress-indicator",
  ],
  "atoms/select": [
    "select-value",
    "select-content",
    "select-label",
    "select-group",
    "select-scroll-up-button",
    "select-trigger",
    "select-scroll-down-button",
    "select-item",
    "select-separator",
  ],
  "atoms/toggle": ["shared", "toggle-group", "toggle"],
  "molecules/attachment": [
    "attachment",
    "attachment-action",
    "attachment-actions",
    "attachment-content",
    "attachment-description",
    "attachment-group",
    "attachment-media",
    "attachment-title",
    "attachment-trigger",
    "shared",
  ],
  "molecules/bubble": [
    "bubble",
    "bubble-content",
    "bubble-group",
    "bubble-reactions",
    "shared",
  ],
  "molecules/button-group": [
    "shared",
    "button-group-separator",
    "button-group-text",
    "button-group",
  ],
  "molecules/code-block": [
    "code-block",
    "code-block-actions",
    "code-block-content",
    "code-block-copy-button",
    "code-block-footer",
    "code-block-header",
    "code-block-line",
    "code-block-title",
    "shared",
  ],
  "molecules/collapsible": [
    "collapsible",
    "collapsible-content",
    "collapsible-trigger",
  ],
  "molecules/dropdown-menu": [
    "dropdown-menu-label",
    "dropdown-menu-trigger",
    "dropdown-menu-sub",
    "dropdown-menu-content",
    "dropdown-menu-shortcut",
    "dropdown-menu",
    "dropdown-menu-item",
    "dropdown-menu-separator",
    "dropdown-menu-radio-group",
    "dropdown-menu-sub-trigger",
    "dropdown-menu-radio-item",
    "dropdown-menu-group",
    "dropdown-menu-checkbox-item",
    "dropdown-menu-sub-content",
    "dropdown-menu-portal",
  ],
  "molecules/empty": [
    "empty-content",
    "empty-description",
    "shared",
    "empty-title",
    "empty-header",
    "empty-media",
    "empty",
  ],
  "molecules/field": [
    "field-content",
    "field",
    "field-group",
    "shared",
    "field-legend",
    "field-error",
    "field-label",
    "field-set",
    "field-title",
    "field-description",
    "field-separator",
  ],
  "molecules/hover-card": [
    "hover-card",
    "hover-card-content",
    "hover-card-trigger",
  ],
  "molecules/input-group": [
    "input-group-button",
    "shared",
    "input-group-textarea",
    "input-group-text",
    "input-group-input",
    "input-group",
    "input-group-addon",
  ],
  "molecules/marker": ["shared", "marker-content", "marker-icon", "marker"],
  "molecules/message": [
    "message",
    "message-avatar",
    "message-content",
    "message-footer",
    "message-group",
    "message-header",
  ],
  "molecules/pagination": [
    "pagination",
    "shared",
    "pagination-content",
    "pagination-previous",
    "pagination-ellipsis",
    "pagination-item",
    "pagination-link",
    "pagination-next",
  ],
  "molecules/popover": ["popover", "popover-content", "popover-trigger"],
  "molecules/radio-group": ["radio-group", "radio-group-item"],
  "molecules/table": [
    "shared",
    "table-caption",
    "table-header",
    "table-footer",
    "table-row",
    "table-cell",
    "table-head",
    "table",
    "table-body",
  ],
  "molecules/tooltip": ["tooltip-trigger", "tooltip-content", "tooltip"],
  "molecules/trace": [
    "trace",
    "trace-collapsible",
    "trace-collapsible-content",
    "trace-collapsible-trigger",
    "trace-description",
    "trace-icon",
    "trace-line",
    "trace-title",
  ],
  "organisms/alert-dialog": [
    "alert-dialog-overlay",
    "alert-dialog-action",
    "alert-dialog-trigger",
    "alert-dialog-content",
    "alert-dialog-header",
    "alert-dialog-media",
    "alert-dialog-portal",
    "alert-dialog-description",
    "alert-dialog",
    "alert-dialog-footer",
    "alert-dialog-cancel",
    "alert-dialog-title",
  ],
  "organisms/dialog": [
    "dialog-close",
    "dialog-content",
    "dialog-overlay",
    "dialog-trigger",
    "dialog-description",
    "dialog-header",
    "dialog-portal",
    "dialog-footer",
    "dialog-title",
    "dialog",
  ],
  "organisms/message-scroller": [
    "message-scroller",
    "message-scroller-button",
    "message-scroller-content",
    "message-scroller-item",
    "message-scroller-provider",
    "message-scroller-viewport",
  ],
  "organisms/questionnaire": [
    "questionnaire-choice",
    "questionnaire-progress",
    "questionnaire-description",
    "questionnaire-error",
    "questionnaire-skip",
    "questionnaire-next",
    "questionnaire-previous",
    "questionnaire-submit",
    "questionnaire-actions",
    "questionnaire-choice-description",
    "questionnaire-title",
    "questionnaire",
    "questionnaire-input",
    "questionnaire-choices",
    "questionnaire-item",
  ],
  "organisms/sheet": [
    "sheet-content",
    "sheet-portal",
    "sheet-footer",
    "sheet-trigger",
    "sheet-title",
    "sheet-description",
    "sheet-header",
    "sheet",
    "sheet-close",
    "sheet-overlay",
  ],
  "organisms/sidebar": [
    "sidebar-separator",
    "sidebar-trigger",
    "sidebar-provider",
    "sidebar-footer",
    "sidebar-rail",
    "sidebar-menu-sub-item",
    "sidebar-inset",
    "shared",
    "sidebar-group-content",
    "sidebar",
    "sidebar-group-label",
    "sidebar-group",
    "sidebar-menu-sub-button",
    "sidebar-group-action",
    "sidebar-header",
    "sidebar-menu-item",
    "sidebar-menu-sub",
    "sidebar-menu-badge",
    "sidebar-menu",
    "sidebar-menu-skeleton",
    "sidebar-input",
    "sidebar-menu-button",
    "sidebar-menu-action",
    "sidebar-content",
  ],
  "organisms/toast": [
    "toaster",
    "toast-action",
    "shared",
    "toast-title",
    "toast-content",
    "toast-close",
    "toast-provider",
    "toast-description",
    "toast-list",
    "toast-viewport",
    "toast-icon",
    "toast-portal",
    "toast",
  ],
};

const primitiveFiles = [
  ...Object.keys(primitiveModules).map(
    (name) => `packages/ui/src/components/${name}.tsx`,
  ),
  "packages/ui/src/providers/tooltip-provider.tsx",
  ...Object.entries(primitiveParts).flatMap(([module, parts]) =>
    parts.map((part) => `packages/ui/src/components/${module}/${part}.tsx`),
  ),
];

const documentFiles = ["packages/ui/.storybook/overview-document.tsx"];

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

// Optional slots may list null or undefined on either side once unions are sorted.
const reactNodeType =
  /^(?:(?:null|undefined)\s*\|\s*)*(?:React\.)?ReactNode(?:\s*\|\s*(?:null|undefined))*$/u;

const typographyClass =
  /^(?:text-|font-|leading-|tracking-|decoration-|underline|overline|line-through|no-underline|italic|not-italic|uppercase|lowercase|capitalize|normal-case|antialiased|subpixel-antialiased|prose(?:-|$))/u;

const placementClass =
  /^(?:(?:-?m[trblxyse]?|w|min-w|max-w|inset(?:-[xy])?|top|bottom|left|right|start|end|z|order|col|row|basis|self|justify-self|place-self|gap|gap-x|gap-y|grid-cols|grid-rows|col-span|row-span)-|(?:block|inline|inline-block|flex|inline-flex|grid|inline-grid|hidden|contents|relative|absolute|fixed|sticky|static|grow|grow-0|shrink|shrink-0|min-h-0|flex-1|flex-auto|flex-none|flex-col|flex-row|flex-wrap|items-start|items-center|items-end|justify-start|justify-center|justify-end|justify-between)$)/u;

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
    // Comparisons only gate classes; their operands never reach the class list.
    if (node.type === "BinaryExpression") return [];
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
    return info?.module.startsWith("@workspace/ui/components/");
  }

  /** Determine if this JSX element owns the text of its descendants.
   * @param node - JSX element.
   * @returns Whether the element is Typography or a registered text-owning part.
   */
  function owner(node) {
    const info = identity(node.openingElement.name);

    if (!shared(info)) return false;

    const module = info.module.slice("@workspace/ui/components/".length);

    if (module === "atoms/typography")
      return /^Typography\.(?:a|blockquote|code|dd|dl|dt|em|h[1-6]|li|ol|p|pre|small|span|srOnly|strong|ul)$/u.test(
        info.name,
      );
    if (primitiveModules[module]?.includes(info.name)) return true;

    const parent = module.slice(0, module.lastIndexOf("/"));

    const part = module.slice(module.lastIndexOf("/") + 1);

    const componentPart = info.name
      .replace(/([a-z0-9])([A-Z])/gu, "$1-$2")
      .replace(/([A-Z])([A-Z][a-z])/gu, "$1-$2")
      .toLowerCase();

    return (
      primitiveParts[parent]?.includes(part) &&
      part === componentPart &&
      (primitiveModules[parent]?.includes(info.name) ?? false)
    );
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
      if (types.has(name)) return slotNames(types.get(name), visited);

      const info = imports.get(name);

      return shared(info)
        ? sharedSlotNames(context.cwd ?? process.cwd(), info.module, info.name)
        : [];
    }
    if (annotation.type === "TSTypeLiteral")
      return annotation.members
        .filter(
          (member) =>
            member.type === "TSPropertySignature" &&
            reactNodeType.test(
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
      node.callee.type === "MemberExpression"
    ) {
      const method = node.callee.property.name;

      const callback =
        method === "from" && node.callee.object.name === "Array"
          ? node.arguments[1]
          : ["flatMap", "map"].includes(method)
            ? node.arguments[0]
            : undefined;

      if (callback?.type === "ArrowFunctionExpression") return safe(callback);
    }

    if (node.type === "ArrowFunctionExpression")
      return node.body.type === "BlockStatement"
        ? returns(node.body).every(safe)
        : safe(node.body);

    const text = source.getText(node);

    // Inline callbacks may forward slots declared by an enclosing component.
    for (let parent = node.parent; parent; parent = parent.parent)
      if (slots.get(parent)?.has(text)) return true;
    return false;
  }

  /** Collect values returned by a function body without entering nested functions.
   * @param node - Statement or expression inside the function body.
   * @returns Returned expressions, with undefined for bare returns.
   */
  function returns(node) {
    if (!node?.type || /Function/u.test(node.type)) return [];
    if (node.type === "ReturnStatement") return [node.argument];
    return Object.entries(node)
      .filter(([key]) => !["loc", "parent", "range"].includes(key))
      .flatMap(([, value]) =>
        Array.isArray(value) ? value.flatMap(returns) : returns(value),
      );
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

      const module = target?.module.slice("@workspace/ui/components/".length);

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
        if (!customProperties(node.value))
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

const sharedSlots = new Map();

/** Decide whether a style attribute only passes dynamic values to classes through CSS custom properties.
 * @param value - JSX attribute value.
 * @returns Whether every property is a statically named `--*` custom property.
 */
function customProperties(value) {
  let object = value?.type === "JSXExpressionContainer" && value.expression;

  // React's CSSProperties omits custom properties, so callers usually cast the object.
  while (["TSAsExpression", "TSSatisfiesExpression"].includes(object?.type))
    object = object.expression;

  return (
    object?.type === "ObjectExpression" &&
    object.properties.length > 0 &&
    object.properties.every(
      (property) =>
        property.type === "Property" &&
        !property.computed &&
        typeof property.key.value === "string" &&
        property.key.value.startsWith("--"),
    )
  );
}

/** Read ReactNode members of a props type exported by a shared UI module, such as a compound part's shared file.
 * @param root - Consumer project directory.
 * @param module - Shared UI import specifier.
 * @param name - Exported type alias name.
 * @returns Names of renderable slots declared directly in that alias's object types.
 */
function sharedSlotNames(root, module, name) {
  const file = join(
    root,
    "packages/ui/src",
    `${module.slice("@workspace/ui/".length)}.tsx`,
  );

  const key = `${file}#${name}`;

  if (sharedSlots.has(key)) return sharedSlots.get(key);

  const names = [];

  const text = existsSync(file) ? readFileSync(file, "utf8") : "";

  const start = text.search(
    new RegExp(`(?:^|\\n)export type ${name}\\b[^=]*=`, "u"),
  );

  if (start !== -1) {
    let depth = 0;

    let member = "";

    for (const character of text.slice(text.indexOf("=", start) + 1)) {
      if (depth === 0 && character === ";") break;
      if (character === "{") depth += 1;
      if (character === "}") depth -= 1;
      // Members end at a top-level semicolon or at the brace closing their object type.
      if (
        (depth === 1 && character === ";") ||
        (depth === 0 && character === "}")
      ) {
        const match =
          /^\s*(?:readonly\s+)?["']?([\w$]+)["']?\??:\s*(.+?)\s*$/su.exec(
            member,
          );

        if (match && reactNodeType.test(match[2])) names.push(match[1]);
        member = "";
      } else if (depth > 1 || (depth === 1 && character !== "{"))
        member += character;
    }
  }
  sharedSlots.set(key, names);
  return names;
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
