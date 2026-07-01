import { For, Show, Dynamic } from "solid-js/web";
import type { JSX } from "solid-js";
import * as s from "./Table.css";
import type { AnyColumn } from "./types";

export interface ScrollMetrics {
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
}

export interface TableProps<R> {
  data: R[];
  columns: AnyColumn<R>[];
  getRowId: (row: R) => string;
  /** Optional status shown below the table (e.g. loading / error / empty). */
  status?: JSX.Element;
  /** Fixed height of the internal scroll area in px. Default 560. */
  maxHeight?: number;
  /** Called on scroll with the current scroll metrics (for infinite scroll). */
  onScroll?: (metrics: ScrollMetrics) => void;
}

function cellClass(col: AnyColumn<unknown>): string {
  return col.align ? `${s.td} ${s.align[col.align]}` : s.td;
}

function headClass(col: AnyColumn<unknown>): string {
  return col.align ? `${s.th} ${s.align[col.align]}` : s.th;
}

export function Table<R>(props: TableProps<R>): JSX.Element {
  const maxHeight = () => props.maxHeight ?? 560;

  // No virtualization: every row is in the DOM. The container scrolls
  // internally so a parent can drive infinite loading from the scroll metrics.
  return (
    <div
      class={s.wrap}
      style={{ "max-height": `${maxHeight()}px` }}
      onScroll={(e) => {
        const el = e.currentTarget;
        props.onScroll?.({
          scrollTop: el.scrollTop,
          scrollHeight: el.scrollHeight,
          clientHeight: el.clientHeight,
        });
      }}
    >
      <table class={s.table}>
        <thead>
          <tr>
            <For each={props.columns}>
              {(col) => (
                <th
                  class={headClass(col as AnyColumn<unknown>)}
                  style={col.width ? { width: col.width } : undefined}
                >
                  {col.header}
                </th>
              )}
            </For>
          </tr>
        </thead>
        <tbody>
          <For each={props.data}>
            {(row, rowIndex) => (
              <tr class={s.row}>
                <For each={props.columns}>
                  {(col) => (
                    <td class={cellClass(col as AnyColumn<unknown>)}>
                      <Dynamic
                        component={col.cell}
                        value={col.accessor ? col.accessor(row) : undefined}
                        row={row}
                        rowIndex={rowIndex()}
                      />
                    </td>
                  )}
                </For>
              </tr>
            )}
          </For>
        </tbody>
      </table>
      <Show when={props.status}>
        <div class={s.statusRow}>{props.status}</div>
      </Show>
    </div>
  );
}
