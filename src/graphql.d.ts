export type GraphqlDiagnostic = {
  column: number;
  line: number;
  message: string;
  rule: string;
  sourceName: string;
};

/**
 * Validate complete SDL against the versioned GraphQL policy, including syntax and schema validity.
 * @param source - Complete SDL text, including any extensions.
 * @param sourceName - File or schema label used in diagnostics.
 * @returns Diagnostics with one-based locations, using 1 when no source location is available.
 */
export declare function checkGraphqlSchema(
  source: string,
  sourceName?: string,
): GraphqlDiagnostic[];
