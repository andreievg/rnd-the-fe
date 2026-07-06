/**
 * Type-safe GraphQL client over the browser `fetch`.
 *
 * DEMO VARIANT 2b — "graphql, parse() + print()".
 *
 * Like demo 2a, the codegen output bundles a PARSED AST (`DocumentNode`) via
 * graphql's `parse()`. Additionally, this client serialises the operation for
 * the wire with graphql's `print()` — the same round-trip a naive AST-based
 * client does. `print()` is graphql's pretty-printer and is comparatively bulky,
 * so this is the MOST expensive of the graphql variants. Prefer 2a (recover
 * text from `.loc`) or urql (demo 3, uses the lightweight graphql.web printer).
 */
import { print, type DocumentNode } from "graphql";

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
  // Serialise the AST back to text with graphql's print() (pulls the printer
  // into the bundle — this is what makes 2b the heaviest graphql variant).
  const query = print(document.document);
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
