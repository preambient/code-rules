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

/** Keep runtime-order diagnostics while exposing their fixes as suggestions.
 * @param rule - Original Perfectionist rule whose automatic edits need review.
 * @returns Rule wrapper that reports order changes as explicit suggestions.
 */
function withReviewedFixes(rule) {
  return {
    ...rule,
    /** Wrap rule reports so order-changing fixes require explicit review.
     * @param context - Linter context used to create rule visitors and report diagnostics.
     * @returns Original rule visitors using the guarded reporting context.
     */
    create(context) {
      const guarded = Object.create(context, {
        report: {
          /** Forward the diagnostic while moving its automatic fix into a review suggestion.
           * @param descriptor - Diagnostic payload with its optional automatic fix and suggestions.
           */
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
    Object.entries(perfectionist.rules).map(
      /** Wrap order-sensitive Perfectionist rules and retain the remaining rules unchanged.
       * @param entry - Rule name and implementation from the upstream plugin.
       * @returns Named rule entry with review protection where evaluation order matters.
       */
      ([name, rule]) => [
        name,
        reviewedRules.has(name) ? withReviewedFixes(rule) : rule,
      ],
    ),
  ),
};
