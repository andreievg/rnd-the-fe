/**
 * Minimal type-safe GraphQL client over the browser `fetch`.
 *
 * Pairs with the codegen output: each generated query exposes a `Document`
 * string plus `Variables` / `Result` types. `graphqlFetch` ties them together
 * so the call site is fully typed with no runtime dependency.
 */
export const GRAPHQL_ENDPOINT = "http://localhost:8000/graphql";

interface GraphQLError {
  message: string;
}

interface GraphQLResponse<TResult> {
  data?: TResult;
  errors?: GraphQLError[];
}

export async function graphqlFetch<TResult, TVariables>(
  query: string,
  variables: TVariables,
  endpoint: string = GRAPHQL_ENDPOINT,
): Promise<TResult> {
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
