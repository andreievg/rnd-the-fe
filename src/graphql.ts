/**
 * GraphQL client — DEMO VARIANT 3: @urql/core.
 *
 * Instead of a hand-rolled fetch wrapper, this uses the real urql client. urql
 * consumes a `TypedDocumentNode<Result, Variables>` (a parsed AST that carries
 * its own types), so the generated `<Name>` consts — produced with urql's own
 * `gql` tag — are fully typed at the call site with zero manual annotations.
 *
 * Notably urql does NOT depend on the heavy `graphql` package: it uses
 * `@0no-co/graphql.web`, a ~20 KB parse/print reimplementation. That's why the
 * full urql client + cache comes out *smaller* than adding graphql's parser by
 * hand (demo 2a/2b). Measured production bundle (JS, gzip): 18.0 KB — and this
 * one includes a normalising document cache and request dedup for free.
 *
 * This client also gives you caching, request dedup, and `@urql/solid`
 * reactivity — none of which the string-based `tests-for-plugin` client has.
 */
import {
  Client,
  cacheExchange,
  fetchExchange,
  type TypedDocumentNode,
} from "@urql/core";

export const GRAPHQL_ENDPOINT = "http://localhost:8000/graphql";

const client = new Client({
  url: GRAPHQL_ENDPOINT,
  exchanges: [cacheExchange, fetchExchange],
});

/**
 * Run a typed document. Result and Variables are inferred from the document, so
 * a query can only be called with its own variables and yields its own result.
 */
export async function graphqlFetch<TResult, TVariables extends Record<string, unknown>>(
  document: TypedDocumentNode<TResult, TVariables>,
  variables: TVariables,
): Promise<TResult> {
  const result = await client.query(document, variables).toPromise();
  if (result.error) {
    throw result.error;
  }
  if (!result.data) {
    throw new Error("GraphQL response contained no data.");
  }
  return result.data;
}
