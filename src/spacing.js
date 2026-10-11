import stylistic from "@stylistic/eslint-plugin";

// Expose only the spacing rule; Oxfmt continues to own all other formatting.
export default {
  rules: {
    "padding-line-between-statements":
      stylistic.rules["padding-line-between-statements"],
  },
};
