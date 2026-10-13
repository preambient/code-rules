import stylistic from "@stylistic/eslint-plugin";

const linesAroundComment = stylistic.rules["lines-around-comment"];

// Expose only spacing rules; Oxfmt continues to own all other formatting.
export default {
  rules: {
    "lines-around-comment": {
      ...linesAroundComment,

      /** Keep argument and type-boundary documentation compact where Oxfmt removes blank lines.
       * @param context - Linter context used for source containment and diagnostics.
       * @returns Upstream visitors with narrow exceptions at formatter-controlled boundaries.
       */
      create(context) {
        const guarded = Object.create(context, {
          report: {
            /** Preserve member spacing while allowing compact argument and type openings.
             * @param descriptor - Upstream comment-spacing diagnostic with its whitespace fix.
             */
            value(descriptor) {
              const parent = context.sourceCode.getNodeByRangeIndex(
                descriptor.node.range[0],
              );

              const previous = context.sourceCode.getTokenBefore(
                descriptor.node,
              );

              if (
                descriptor.messageId === "before" &&
                (parent?.type === "CallExpression" ||
                  parent?.type === "NewExpression" ||
                  (parent?.type === "TSTypeAliasDeclaration" &&
                    previous?.value === "=") ||
                  (parent?.type === "TSIntersectionType" &&
                    previous?.value === "&") ||
                  (parent?.type === "TSUnionType" && previous?.value === "|"))
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
