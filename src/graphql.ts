/**
 * Minimal type-safe GraphQL client over the browser `fetch`.
 *
 * Pairs with the codegen output: each generated query exposes a `Document`
 * string plus `Variables` / `Result` types. `graphqlFetch` ties them together
 * so the call site is fully typed with no runtime dependency.
 */
// LAN IP so the backend is reachable from other devices (e.g. a tablet) hitting
// the build served on 192.168.1.75:3121, not just localhost.
export const GRAPHQL_ENDPOINT = "http://192.168.1.75:8000/graphql";

/**
 * A query bundled with its types. Codegen emits one of these per operation:
 * the query string plus phantom Result / Variables types (type-only, never
 * assigned at runtime). `graphqlFetch` infers both from the passed document, so
 * a query can only be called with its own variables and yields its own result.
 */
export interface TypedDocument<TResult, TVariables> {
  query: string;
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
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: document.query, variables }),
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
