/**
 * Type-safe GraphQL client over the browser `fetch`.
 *
 * DEMO VARIANT 2a — "graphql, parse() only".
 *
 * The codegen output now bundles a PARSED AST (`DocumentNode`) instead of a raw
 * string, produced by graphql's `parse()`. This is the shape urql/Apollo
 * consume. We do NOT use graphql's `print()` here (that's demo 2b): we recover
 * the query text from the AST's attached source (`.loc`) so `graphql`'s heavy
 * printer never enters the bundle. Adding graphql's parser alone roughly
 * doubles the gzipped bundle vs. the string-based `tests-for-plugin` branch.
 */
import type { DocumentNode } from "graphql";

export const GRAPHQL_ENDPOINT = "http://localhost:8000/graphql";

/**
 * A query bundled with its types. `document` is a parsed GraphQL AST; the
 * phantom Result / Variables types are type-only (never assigned at runtime).
 */
export interface TypedDocument<TResult, TVariables> {
  document: DocumentNode;
  /** Phantom — carries the result type only; not present at runtime. */
  __result?: TResult;
  /** Phantom — carries the variables type only; not present at runtime. */
  __variables?: TVariables;
}

interface GraphQLError {
  message: string;
}

interface GraphQLResponse<TResult> {
  data?: TResult;
  errors?: GraphQLError[];
}

export async function graphqlFetch<TResult, TVariables>(
  document: TypedDocument<TResult, TVariables>,
  variables: TVariables,
  endpoint: string = GRAPHQL_ENDPOINT,
): Promise<TResult> {
  // Recover the query text from the AST's attached source, so we don't pull
  // graphql's `print()` into the bundle (see demo 2b for the print() variant).
  const query = document.document.loc?.source.body ?? "";
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    throw new Error(`GraphQL request failed: ${res.status} ${res.statusText}`);
  }

  const json = (await res.json()) as GraphQLResponse<TResult>;

  if (json.errors && json.errors.length > 0) {
    throw new Error(json.errors.map((e) => e.message).join("; "));
  }
  if (!json.data) {
    throw new Error("GraphQL response contained no data.");
  }

  return json.data;
}
