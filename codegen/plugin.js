/**
 * Custom graphql-codegen plugin.
 *
 * For each operation in a .graphql document it emits:
 *   - export const <Name>Document: string   (the query text, with used fragments inlined)
 *   - export type <Name>Variables = { ... }  (from the operation's variable defs)
 *   - export type <Name>Result = { ... }     (walked against the schema for accurate nullability)
 *
 * It deliberately avoids the official @graphql-codegen/typescript plugins so the
 * project keeps a single, readable code path. Types are derived from the schema
 * AST via graphql's TypeInfo, so nullability / scalars are accurate.
 */
const {
  Kind,
  TypeInfo,
  visit,
  visitWithTypeInfo,
  isNonNullType,
  isListType,
  isScalarType,
  isEnumType,
  print,
} = require("graphql");

/** Map GraphQL scalar names to TS types. Unknown scalars fall back to string. */
const SCALAR_MAP = {
  ID: "string",
  String: "string",
  Boolean: "boolean",
  Int: "number",
  Float: "number",
  NaiveDate: "string",
  DateTime: "string",
};

function tsForNamedType(type) {
  if (isScalarType(type)) {
    return SCALAR_MAP[type.name] ?? "string";
  }
  if (isEnumType(type)) {
    return type.getValues().map((v) => JSON.stringify(v.value)).join(" | ");
  }
  // Object / interface / union handled by the selection-set walker, not here.
  return "unknown";
}

/** Render a TS type for a GraphQL output type, wrapping a pre-rendered inner body. */
function wrapType(type, innerBody) {
  if (isNonNullType(type)) {
    return stripNull(wrapType(type.ofType, innerBody));
  }
  if (isListType(type)) {
    return `Array<${wrapType(type.ofType, innerBody)}>` + " | null";
  }
  // Nullable leaf
  return `${innerBody} | null`;
}

function stripNull(rendered) {
  return rendered.endsWith(" | null") ? rendered.slice(0, -" | null".length) : rendered;
}

/** Walk a selection set against its GraphQL type, returning a TS object-type body. */
function renderSelectionSet(selectionSet, parentType, schema, fragments) {
  const lines = [];
  for (const sel of selectionSet.selections) {
    if (sel.kind === Kind.FIELD) {
      const fieldName = sel.name.value;
      if (fieldName === "__typename") {
        lines.push(`  __typename: string;`);
        continue;
      }
      const fieldDef = parentType.getFields()[fieldName];
      if (!fieldDef) continue;
      const alias = sel.alias ? sel.alias.value : fieldName;
      const fieldType = fieldDef.type;
      const namedType = getNamedType(fieldType);

      let rendered;
      if (sel.selectionSet) {
        const body = renderSelectionSet(sel.selectionSet, namedType, schema, fragments);
        rendered = wrapType(fieldType, body);
      } else {
        rendered = wrapType(fieldType, tsForNamedType(namedType));
      }
      lines.push(`  ${alias}: ${rendered};`);
    } else if (sel.kind === Kind.FRAGMENT_SPREAD) {
      const frag = fragments[sel.name.value];
      if (!frag) continue;
      const fragType = schema.getType(frag.typeCondition.name.value);
      const body = renderSelectionSet(frag.selectionSet, fragType, schema, fragments);
      // Merge fragment fields inline (strip the wrapping braces).
      lines.push(innerLines(body));
    } else if (sel.kind === Kind.INLINE_FRAGMENT) {
      const condType = sel.typeCondition
        ? schema.getType(sel.typeCondition.name.value)
        : parentType;
      const body = renderSelectionSet(sel.selectionSet, condType, schema, fragments);
      lines.push(innerLines(body));
    }
  }
  return `{\n${lines.join("\n")}\n}`;
}

/** Pull the inner lines out of a "{ ... }" body so fragment fields merge flat. */
function innerLines(body) {
  return body.replace(/^\{\n/, "").replace(/\n\}$/, "");
}

function getNamedType(type) {
  let t = type;
  while (t.ofType) t = t.ofType;
  return t;
}

/** Render a TS type for an input/variable type node (from variable definitions). */
function renderInputType(typeNode, schema) {
  if (typeNode.kind === Kind.NON_NULL_TYPE) {
    return { ts: stripNull(renderInputType(typeNode.type, schema).ts), nonNull: true };
  }
  if (typeNode.kind === Kind.LIST_TYPE) {
    const inner = renderInputType(typeNode.type, schema);
    return { ts: `Array<${inner.ts}> | null`, nonNull: false };
  }
  // NAMED_TYPE
  const name = typeNode.name.value;
  const namedType = schema.getType(name);
  let ts;
  if (namedType && isScalarType(namedType)) {
    ts = SCALAR_MAP[name] ?? "string";
  } else if (namedType && isEnumType(namedType)) {
    ts = namedType.getValues().map((v) => JSON.stringify(v.value)).join(" | ");
  } else if (namedType && namedType.getFields) {
    // Input object type — render its fields.
    const fields = namedType.getFields();
    const inner = Object.values(fields)
      .map((f) => {
        const r = renderInputTypeFromGraphQLType(f.type, schema);
        const optional = r.nonNull ? "" : "?";
        return `    ${f.name}${optional}: ${r.ts};`;
      })
      .join("\n");
    ts = `{\n${inner}\n  }`;
  } else {
    ts = "unknown";
  }
  return { ts: `${ts} | null`, nonNull: false };
}

/** Same as renderInputType but starting from a GraphQL type object (not an AST node). */
function renderInputTypeFromGraphQLType(type, schema) {
  if (isNonNullType(type)) {
    return { ts: stripNull(renderInputTypeFromGraphQLType(type.ofType, schema).ts), nonNull: true };
  }
  if (isListType(type)) {
    const inner = renderInputTypeFromGraphQLType(type.ofType, schema);
    return { ts: `Array<${inner.ts}> | null`, nonNull: false };
  }
  let ts;
  if (isScalarType(type)) {
    ts = SCALAR_MAP[type.name] ?? "string";
  } else if (isEnumType(type)) {
    ts = type.getValues().map((v) => JSON.stringify(v.value)).join(" | ");
  } else if (type.getFields) {
    const fields = type.getFields();
    const inner = Object.values(fields)
      .map((f) => {
        const r = renderInputTypeFromGraphQLType(f.type, schema);
        const optional = r.nonNull ? "" : "?";
        return `    ${f.name}${optional}: ${r.ts};`;
      })
      .join("\n");
    ts = `{\n${inner}\n  }`;
  } else {
    ts = "unknown";
  }
  return { ts: `${ts} | null`, nonNull: false };
}

function renderVariables(operation, schema) {
  const defs = operation.variableDefinitions ?? [];
  if (defs.length === 0) return "Record<string, never>";
  const lines = defs.map((def) => {
    const name = def.variable.name.value;
    const r = renderInputType(def.type, schema);
    const optional = r.nonNull ? "" : "?";
    return `  ${name}${optional}: ${r.ts};`;
  });
  return `{\n${lines.join("\n")}\n}`;
}

/** Collect fragment names reachable from a selection set (for inlining the doc text). */
function collectFragments(selectionSet, fragments, acc) {
  for (const sel of selectionSet.selections) {
    if (sel.kind === Kind.FRAGMENT_SPREAD) {
      const name = sel.name.value;
      if (!acc.has(name) && fragments[name]) {
        acc.add(name);
        collectFragments(fragments[name].selectionSet, fragments, acc);
      }
    } else if (sel.selectionSet) {
      collectFragments(sel.selectionSet, fragments, acc);
    }
  }
  return acc;
}

module.exports = {
  plugin(schema, documents) {
    // Gather all fragment definitions across documents.
    const fragments = {};
    for (const doc of documents) {
      for (const def of doc.document.definitions) {
        if (def.kind === Kind.FRAGMENT_DEFINITION) {
          fragments[def.name.value] = def;
        }
      }
    }

    const out = [
      "/* eslint-disable */",
      "// THIS FILE IS GENERATED by codegen/plugin.js — do not edit by hand.",
      "",
    ];

    for (const doc of documents) {
      for (const def of doc.document.definitions) {
        if (def.kind !== Kind.OPERATION_DEFINITION || !def.name) continue;
        const name = def.name.value;
        const rootType =
          def.operation === "query"
            ? schema.getQueryType()
            : def.operation === "mutation"
              ? schema.getMutationType()
              : schema.getSubscriptionType();

        // --- Result type ---
        const resultBody = renderSelectionSet(def.selectionSet, rootType, schema, fragments);

        // --- Variables type ---
        const variablesBody = renderVariables(def, schema);

        // --- Document string (operation + its reachable fragments) ---
        const used = collectFragments(def.selectionSet, fragments, new Set());
        const parts = [print(def)];
        for (const fragName of used) parts.push(print(fragments[fragName]));
        const docText = parts.join("\n\n");

        out.push(`export type ${name}Variables = ${variablesBody};`);
        out.push("");
        out.push(`export type ${name}Result = ${resultBody};`);
        out.push("");
        out.push(`export const ${name}Document = ${JSON.stringify(docText)};`);
        out.push("");
      }
    }

    return out.join("\n");
  },
};
