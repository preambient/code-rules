// Export wrappers are statements themselves, so match their declarations explicitly.
const declarations = [
  "const",
  "let",
  "var",
  "using",
  "function",
  "function-overload",
  { selector: "VariableDeclaration[declare=true]" },
  {
    selector:
      ":matches(ExportNamedDeclaration, ExportDefaultDeclaration):matches([declaration.type='VariableDeclaration'], [declaration.type='FunctionDeclaration'], [declaration.type='FunctionExpression'], [declaration.type='ArrowFunctionExpression'], [declaration.type='TSDeclareFunction'])",
  },
];

export const spacingRules = {
  "stylistic/padding-line-between-statements": [
    "error",
    { blankLine: "always", next: declarations, prev: "*" },
    { blankLine: "always", next: "*", prev: declarations },
    { blankLine: "always", next: "import", prev: "*" },
    { blankLine: "always", next: "*", prev: "import" },
    { blankLine: "never", next: "import", prev: "import" },
    // Keep overload signatures attached to their implementation.
    {
      blankLine: "any",
      next: ["function", "function-overload"],
      prev: "function-overload",
    },
    {
      blankLine: "any",
      next: {
        selector:
          "ExportNamedDeclaration:matches([declaration.type='TSDeclareFunction'], [declaration.type='FunctionDeclaration'])",
      },
      prev: {
        selector:
          "ExportNamedDeclaration[declaration.type='TSDeclareFunction']",
      },
    },
  ],
};
