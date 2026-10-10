import perfectionist from "eslint-plugin-perfectionist";

export const alphabeticalRules = {
  ...perfectionist.configs["recommended-alphabetical"].rules,
  // Generic positional arrays remain ordered. SORTED_* explicitly opts a list in.
  "perfectionist/sort-arrays": [
    "error",
    {
      order: "asc",
      type: "alphabetical",
      useConfigurationIf: {
        matchesAstSelector:
          "VariableDeclarator[id.name=/^SORTED_/] > ArrayExpression",
      },
    },
  ],
  "perfectionist/sort-imports": [
    "error",
    {
      groups: ["import", "unknown"],
      ignoreCase: true,
      newlinesBetween: 0,
      order: "asc",
      sortSideEffects: false,
      type: "alphabetical",
    },
  ],
  // JSX sorting belongs to the frontend profile.
  "perfectionist/sort-jsx-props": "off",
  "perfectionist/sort-named-imports": "off",
  // Native Oxlint owns named-import ordering; the plugin owns declaration order.
  "sort-imports": ["error", { ignoreCase: true, ignoreDeclarationSort: true }],
};

export const jsxSortingRule = ["error", { order: "asc", type: "alphabetical" }];
