import { alphabeticalRules } from "./alphabetical.js";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { defineConfig } from "oxlint";

const require = createRequire(import.meta.url);

export default defineConfig({
  categories: { correctness: "error" },
  ignorePatterns: [
    "**/node_modules/**",
    "**/dist/**",
    "**/out/**",
    "**/.next/**",
    "**/next-env.d.ts",
    "**/.source/**",
    ".agents/**",
    ".claude/**",
    "**/storybook-static/**",
    "**/.drizzle/**",
  ],
  jsPlugins: [
    {
      name: "jsdoc-js",
      specifier: require.resolve("eslint-plugin-jsdoc"),
    },
    {
      name: "perfectionist",
      specifier: fileURLToPath(new URL("./perfectionist.js", import.meta.url)),
    },
  ],
  plugins: ["typescript", "import"],
  rules: {
    ...alphabeticalRules,
    "jsdoc-js/check-param-names": ["error", { checkDestructured: false }],
    "jsdoc-js/check-syntax": "error",
    "jsdoc-js/check-tag-names": "error",
    "jsdoc-js/match-description": [
      "error",
      {
        matchDescription:
          "/^(?!\\s*(?:todo|tbd|fixme|description)[.!\\s]*$)[\\s\\S]*\\S[\\s\\S]*$/i",
        message:
          "Describe what this function does instead of leaving a placeholder.",
        tags: { param: true, returns: true, yields: true },
      },
    ],
    "jsdoc-js/require-description": [
      "error",
      {
        descriptionStyle: "any",
        exemptedBy: [],
      },
    ],
    "jsdoc-js/require-jsdoc": [
      "error",
      {
        checkAllFunctionExpressions: true,
        checkConstructors: true,
        checkGetters: true,
        checkSetters: true,
        contexts: [
          ":matches(ArrowFunctionExpression, FunctionDeclaration, FunctionExpression)",
        ],
        enableFixer: false,
        exemptEmptyConstructors: false,
        exemptEmptyFunctions: false,
        require: { FunctionDeclaration: false },
      },
    ],
    "jsdoc-js/require-param": [
      "error",
      {
        checkDestructured: false,
        checkDestructuredRoots: true,
        enableFixer: false,
        enableRestElementFixer: true,
        enableRootFixer: false,
        exemptedBy: [],
      },
    ],
    "jsdoc-js/require-param-description": "error",
    "jsdoc-js/require-returns": [
      "error",
      { enableFixer: false, exemptedBy: [], forceReturnsWithAsync: true },
    ],
    "jsdoc-js/require-returns-description": "error",
    "jsdoc-js/require-yields": "error",
    "jsdoc-js/require-yields-description": "error",
    "jsdoc-js/valid-types": "error",
    "no-restricted-imports": [
      "error",
      {
        patterns: [
          {
            message:
              "Relative imports must reference a file in the same directory. Use a package export or an alias for other directories.",
            regex: "^(?:\\.\\.(?:/|$)|\\./(?:.*/|$))",
          },
        ],
      },
    ],
    "typescript/consistent-type-definitions": ["error", "type"],
  },
  settings: {
    jsdoc: {
      augmentsExtendsReplacesDocs: false,
      ignoreReplacesDocs: false,
      implementsReplacesDocs: false,
      mode: "typescript",
      overrideReplacesDocs: false,
    },
  },
});
