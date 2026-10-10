import perfectionist from "eslint-plugin-perfectionist";

// Runtime evaluation and iteration order needs human review before a rewrite.
const reviewedRules = new Set([
  "sort-array-includes",
  "sort-arrays",
  "sort-classes",
  "sort-decorators",
  "sort-enums",
  "sort-exports",
  "sort-imports",
  "sort-intersection-types",
  "sort-jsx-props",
  "sort-maps",
  "sort-modules",
  "sort-objects",
  "sort-sets",
  "sort-switch-case",
  "sort-variable-declarations",
]);

/** Keep runtime-order diagnostics while exposing their fixes as suggestions. */
function withReviewedFixes(rule) {
  return {
    ...rule,
    create(context) {
      const guarded = Object.create(context, {
        report: {
          value(descriptor) {
            const { fix, suggest = [], ...diagnostic } = descriptor;
            context.report({
              ...diagnostic,
              ...(fix
                ? {
                    suggest: [
                      ...suggest,
                      { fix, messageId: "reviewRuntimeOrder" },
                    ],
                  }
                : { suggest }),
            });
          },
        },
      });
      return rule.create(guarded);
    },
    meta: {
      ...rule.meta,
      fixable: undefined,
      hasSuggestions: true,
      messages: {
        ...rule.meta.messages,
        reviewRuntimeOrder:
          "Sort alphabetically after reviewing evaluation and iteration order.",
      },
    },
  };
}

export default {
  ...perfectionist,
  rules: Object.fromEntries(
    Object.entries(perfectionist.rules).map(([name, rule]) => [
      name,
      reviewedRules.has(name) ? withReviewedFixes(rule) : rule,
    ]),
  ),
};
