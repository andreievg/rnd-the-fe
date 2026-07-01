import type { CodegenConfig } from "@graphql-codegen/cli";

/**
 * graphql-codegen config using the official graphql-request SDK plugins.
 *
 * Introspects the live schema, globs every src/**\/*.graphql, and emits a single
 * bundled SDK (src/generated/sdk.ts) exposing `getSdk(client)` — one typed method
 * per operation (e.g. `sdk.stocktakeLines(vars)`), backed by graphql-request.
 *
 * NOTE: the typescript / typescript-operations plugins are pinned to the v4 line
 * (see package.json). In the v6/v7 line the `typescript` and
 * `typescript-operations` plugins both emit every referenced input type into the
 * same file, producing duplicate-identifier errors; v4 emits each once.
 *
 * SCHEMA_URL env overrides the introspection endpoint.
 */
const SCHEMA_URL = process.env.SCHEMA_URL || "http://localhost:8000/graphql";

const config: CodegenConfig = {
  schema: SCHEMA_URL,
  documents: ["src/**/*.graphql"],
  ignoreNoDocuments: true,
  generates: {
    "src/generated/sdk.ts": {
      plugins: [
        "typescript",
        "typescript-operations",
        "typescript-graphql-request",
      ],
      config: {
        scalars: {
          NaiveDate: "string",
          DateTime: "string",
        },
      },
    },
  },
};

export default config;
