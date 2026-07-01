import type { JSX } from "solid-js";
import * as s from "./Table.css";

/**
 * Prebuilt cell components. Each is a component you import and use directly in a
 * column definition (`cell: TextCell`) rather than a tagged enum.
 *
 * These key off `value` only and keep `row` loose (`unknown`) so they stay
 * reusable across any table; `defineColumns` still checks each cell's `value`
 * type against its column's accessor. Per-table composite cells (which read the
 * row) are written against the concrete row type — see DifferenceCell usage.
 */

/** Renders the value as text; blanks for null/undefined. */
export function TextCell(props: { value: string | null | undefined; row: unknown }): JSX.Element {
  return <span>{props.value ?? ""}</span>;
}

/** Numeric value; renders "-" for null/undefined. Pair with align: "right". */
export function NumberCell(props: { value: number | null | undefined; row: unknown }): JSX.Element {
  return <span>{props.value == null ? "-" : String(props.value)}</span>;
}

/** Value styled as a (non-navigating) link, matching the app's blue item links. */
export function LinkCell(props: { value: string | null | undefined; row: unknown }): JSX.Element {
  return <span class={s.linkCell}>{props.value ?? ""}</span>;
}

/** A static (visual-only) checkbox, e.g. for a leading selection column. */
export function CheckboxCell(_props: { value: undefined; row: unknown }): JSX.Element {
  return <span class={s.checkbox} />;
}
