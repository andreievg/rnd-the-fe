import type { JSX } from "solid-js";
import * as s from "./Table.css";

/**
 * Header components + helpers. A column's `header` is always a JSX.Element,
 * composed from these helpers (mirrors the composable `cell` approach):
 *
 *   { header: textHeader("Name"), ... }
 */

export function TextHeader(props: { children: JSX.Element }): JSX.Element {
  return <span class={s.headerText}>{props.children}</span>;
}

export const textHeader = (label: string): JSX.Element => (
  <TextHeader>{label}</TextHeader>
);
