import { For, Show, Dynamic } from "solid-js/web";
import { createSignal, onCleanup, onMount, type JSX } from "solid-js";
import * as s from "./Table.css";
import type { AnyColumn } from "./types";
import { createVirtualizer } from "./virtual";

export interface TableProps<R> {
  data: R[];
  columns: AnyColumn<R>[];
  getRowId: (row: R) => string;
  /** Optional status shown below the table (e.g. loading / error / empty). */
  status?: JSX.Element;
  /** Fixed row height in px used for virtualization. Default 52. */
  rowHeight?: number;
  /** Max height of the scroll viewport in px. Default 640. */
  maxHeight?: number;
  /** Extra rows rendered above/below the viewport. Default 6. */
  overscan?: number;
}

function cellClass(col: AnyColumn<unknown>): string {
  return col.align ? `${s.td} ${s.align[col.align]}` : s.td;
}

function headClass(col: AnyColumn<unknown>): string {
  return col.align ? `${s.th} ${s.align[col.align]}` : s.th;
}

export function Table<R>(props: TableProps<R>): JSX.Element {
  const rowHeight = () => props.rowHeight ?? 52;
  const maxHeight = () => props.maxHeight ?? 640;

  const [scrollTop, setScrollTop] = createSignal(0);
  const [viewportHeight, setViewportHeight] = createSignal(maxHeight());

  let scroller: HTMLDivElement | undefined;

  const measure = () => {
    if (scroller) setViewportHeight(scroller.clientHeight);
  };

  onMount(() => {
    measure();
    // Track viewport size changes (e.g. window resize) without a scroll event.
    const ro = new ResizeObserver(measure);
    if (scroller) ro.observe(scroller);
    onCleanup(() => ro.disconnect());
  });

  const range = createVirtualizer({
    count: () => props.data.length,
    rowHeight,
    scrollTop,
    viewportHeight,
    overscan: props.overscan,
  });

  // The visible slice of rows, paired with their absolute index.
  const visibleRows = () => {
    const { start, end } = range();
    const out: { row: R; index: number }[] = [];
    for (let i = start; i < end; i++) out.push({ row: props.data[i], index: i });
    return out;
  };

  return (
    <div
      class={s.wrap}
      ref={scroller}
      style={{ "max-height": `${maxHeight()}px` }}
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
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
          {/* Top spacer preserves scroll height for rows above the window. */}
          <Show when={range().paddingTop > 0}>
            <tr aria-hidden="true" style={{ height: `${range().paddingTop}px` }} />
          </Show>
          <For each={visibleRows()}>
            {(entry) => (
              <tr class={s.row} style={{ height: `${rowHeight()}px` }}>
                <For each={props.columns}>
                  {(col) => (
                    <td class={cellClass(col as AnyColumn<unknown>)}>
                      <Dynamic
                        component={col.cell}
                        value={col.accessor ? col.accessor(entry.row) : undefined}
                        row={entry.row}
                        rowIndex={entry.index}
                      />
                    </td>
                  )}
                </For>
              </tr>
            )}
          </For>
          {/* Bottom spacer preserves scroll height for rows below the window. */}
          <Show when={range().paddingBottom > 0}>
            <tr aria-hidden="true" style={{ height: `${range().paddingBottom}px` }} />
          </Show>
        </tbody>
      </table>
      <Show when={props.status}>
        <div class={s.statusRow}>{props.status}</div>
      </Show>
    </div>
  );
}
