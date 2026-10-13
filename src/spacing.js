import stylistic from "@stylistic/eslint-plugin";

const linesAroundComment = stylistic.rules["lines-around-comment"];

// Expose only spacing rules; Oxfmt continues to own all other formatting.
export default {
  rules: {
    "lines-around-comment": {
      ...linesAroundComment,

      /** Keep inline argument documentation compact where Oxfmt removes blank lines.
       * @param context - Linter context used for source containment and diagnostics.
       * @returns Upstream comment visitors with an exception for argument-list comments.
       */
      create(context) {
        const guarded = Object.create(context, {
          report: {
            /** Forward member and statement diagnostics while preserving inline argument comments.
             * @param descriptor - Upstream comment-spacing diagnostic with its whitespace fix.
             */
            value(descriptor) {
              const parent = context.sourceCode.getNodeByRangeIndex(
                descriptor.node.range[0],
              );

              if (
                descriptor.messageId === "before" &&
                (parent?.type === "CallExpression" ||
                  parent?.type === "NewExpression")
              )
                return;
              context.report(descriptor);
            },
          },
        });

        return linesAroundComment.create(guarded);
      },
    },
    "padding-line-between-statements":
      stylistic.rules["padding-line-between-statements"],
  },
};
