import type { JSX } from "solid-js";

/** What a cell / header renders. */
export type CellNode = JSX.Element;

/** Props every cell component receives. `value` is the accessor's return type. */
export interface CellProps<V, R> {
  value: V;
  row: R;
  rowIndex: number;
}

/** A cell is any component taking CellProps — import & use it in a column. */
export type Cell<V, R> = (props: CellProps<V, R>) => CellNode;

export type Align = "left" | "right" | "center";

/**
 * Per-column constraint: a column with an `accessor` returning V must pair with
 * a `cell` whose `value` is V; a column without an accessor gets `value: undefined`.
 * Applied as a self-referential constraint in `defineColumns`, so each column's
 * cell is checked against its own accessor and accessor `row` params are typed —
 * no per-column type param and no hand annotations needed.
 *
 * The `(row: any)` in the `infer V` check (rather than `never`) and the inline
 * (non-intersected) object shapes are load-bearing: intersections or `never`
 * here collapse every column to the no-accessor branch.
 */
export type Cols<R, T extends readonly any[]> = {
  [K in keyof T]: T[K] extends { accessor: (row: any) => infer V }
    ? { accessor: (row: R) => V; header: CellNode; cell: Cell<V, R>; align?: Align; width?: string }
    : { header: CellNode; cell: Cell<undefined, R>; align?: Align; width?: string };
};

/** A single erased column the Table iterates over. */
export interface AnyColumn<R> {
  accessor?: (row: R) => unknown;
  header: CellNode;
  cell: Cell<unknown, R>;
  align?: Align;
  width?: string;
}

/**
 * Bind the Row type once, then define columns as a plain object-literal array.
 * Accessor `row` params are typed as R, and each `cell`'s `value` is checked
 * against its accessor's return type:
 *
 *   const columns = defineColumns<LineNode>()([
 *     { accessor: (row) => row.itemName, header: textHeader("Name"), cell: TextCell },
 *     { header: textHeader("Difference"), cell: DifferenceCell },
 *   ]);
 */
export function defineColumns<R>() {
  return function <
    const T extends readonly {
      accessor?: (row: R) => any;
      header: CellNode;
      cell: any;
      align?: Align;
      width?: string;
    }[],
  >(cols: [T] extends [Cols<R, T>] ? T : Cols<R, T>): AnyColumn<R>[] {
    return cols as unknown as AnyColumn<R>[];
  };
}
