export { Table } from "./Table";
export type { TableProps, ScrollMetrics } from "./Table";
export { defineColumns } from "./types";
export type { CellProps, Cell, AnyColumn, Align } from "./types";
export { TextCell, NumberCell, LinkCell, CheckboxCell } from "./cells";
export { TextHeader, textHeader } from "./headers";
// Virtualization removed for now — src/table/virtual.ts is kept for easy
// re-wiring later, but nothing imports it while the table renders all rows.
