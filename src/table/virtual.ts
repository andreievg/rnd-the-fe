import { createMemo, type Accessor } from "solid-js";

export interface VirtualizerOptions {
  /** Total number of rows. */
  count: Accessor<number>;
  /** Fixed height of a single row, in px. */
  rowHeight: Accessor<number>;
  /** Current scroll offset of the scroll container, in px. */
  scrollTop: Accessor<number>;
  /** Visible height of the scroll container, in px. */
  viewportHeight: Accessor<number>;
  /** Extra rows rendered above/below the viewport to avoid blank flashes. */
  overscan?: number;
}

export interface VirtualRange {
  /** Index of the first row to render (inclusive). */
  start: number;
  /** Index one past the last row to render (exclusive). */
  end: number;
  /** Spacer height above the rendered rows, in px. */
  paddingTop: number;
  /** Spacer height below the rendered rows, in px. */
  paddingBottom: number;
  /** Total scrollable height of all rows, in px. */
  totalHeight: number;
}

/**
 * Fixed-height windowing math. Pure and dependency-free: given scroll offset,
 * viewport height and row height, it returns the slice of rows to render plus
 * the top/bottom spacer heights that preserve the scrollbar position.
 */
export function createVirtualizer(options: VirtualizerOptions): Accessor<VirtualRange> {
  const overscan = options.overscan ?? 6;

  return createMemo<VirtualRange>(() => {
    const count = options.count();
    const rowHeight = options.rowHeight();
    const totalHeight = count * rowHeight;

    if (count === 0 || rowHeight <= 0) {
      return { start: 0, end: 0, paddingTop: 0, paddingBottom: 0, totalHeight };
    }

    const scrollTop = Math.max(0, options.scrollTop());
    const viewportHeight = options.viewportHeight();

    const firstVisible = Math.floor(scrollTop / rowHeight);
    const visibleCount = Math.ceil(viewportHeight / rowHeight);

    const start = Math.max(0, firstVisible - overscan);
    const end = Math.min(count, firstVisible + visibleCount + overscan);

    return {
      start,
      end,
      paddingTop: start * rowHeight,
      paddingBottom: (count - end) * rowHeight,
      totalHeight,
    };
  });
}
