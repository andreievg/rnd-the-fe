import { GraphQLClient } from "graphql-request";
import { getSdk } from "./generated/sdk";

export const GRAPHQL_ENDPOINT = "http://localhost:8000/graphql";

const client = new GraphQLClient(GRAPHQL_ENDPOINT);

/** Typed GraphQL SDK — one method per operation, e.g. sdk.stocktakeLines(vars). */
export const sdk = getSdk(client);
