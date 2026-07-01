import { For, Show, createMemo, createSignal, onMount } from "solid-js";
import {
  createSolidTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/solid-table";
import { createVirtualizer } from "@tanstack/solid-virtual";
import * as s from "./Stocktake.css";
import { stocktakeMeta } from "./stocktakeData";
import { graphqlFetch } from "./graphql";
import { StocktakeLines, type StocktakeLinesResult } from "./stocktakeLines.generated";

// Hardcoded for this step — render just the table (no filters / URL parsing yet).
const STOCKTAKE_ID = "019f17d0-1444-795c-ac53-da2216c73cff";
const STORE_ID = "5B28901C52396E4BB098B9862CCF5DF9";

// Fixed row height (matches the design token) so the virtualizer can size the
// scroll area without measuring every row.
const ROW_HEIGHT = 52;

// A single line node straight from the generated GraphQL result type.
type LineNode =
  StocktakeLinesResult["stocktakeLines"]["nodes"][number];

const dash = (v: string | null | undefined) => (v == null || v === "" ? "" : v);
const numOrDash = (v: number | null | undefined) =>
  v == null ? "-" : String(v);

/**
 * Column definitions for TanStack Table. Each accessor derives its display
 * string straight from the GraphQL line node, so the flattening that used to
 * live in `toCells` now sits with the column it belongs to.
 */
const columns: ColumnDef<LineNode>[] = [
  { id: "code", header: "Code", accessorFn: (l) => l.item.code, meta: { link: true } },
  {
    id: "name",
    header: "Name",
    accessorFn: (l) => l.itemName,
    meta: { link: true, sorted: "asc" as const },
  },
  { id: "batch", header: "Batch", accessorFn: (l) => dash(l.batch) },
  { id: "expiryDate", header: "Expiry date", accessorFn: (l) => dash(l.expiryDate) },
  {
    id: "manufactureDate",
    header: "Manufacture date",
    accessorFn: (l) => dash(l.manufactureDate),
  },
  { id: "location", header: "Location", accessorFn: (l) => dash(l.location?.name) },
  { id: "unitName", header: "Unit name", accessorFn: (l) => dash(l.item.unitName) },
  { id: "packSize", header: "Pack size", accessorFn: (l) => numOrDash(l.packSize) },
  {
    id: "packsSnapshot",
    header: "Packs snapshot",
    accessorFn: (l) => String(l.snapshotNumberOfPacks),
    meta: { numeric: true },
  },
  {
    id: "packsCounted",
    header: "Packs counted",
    accessorFn: (l) =>
      l.countedNumberOfPacks == null ? "" : String(l.countedNumberOfPacks),
    meta: { numeric: true },
  },
  {
    id: "difference",
    header: "Difference",
    accessorFn: (l) =>
      l.countedNumberOfPacks == null
        ? "-"
        : String(l.countedNumberOfPacks - l.snapshotNumberOfPacks),
    meta: { numeric: true },
  },
  { id: "reason", header: "Reason", accessorFn: (l) => dash(l.reasonOption?.reason) },
  {
    id: "manufacturer",
    header: "Manufacturer",
    accessorFn: (l) => dash(l.manufacturer?.name),
  },
];

// Extra per-column display hints carried on ColumnDef.meta.
type ColumnMeta = { link?: boolean; numeric?: boolean; sorted?: "asc" | "desc" };
const metaOf = (meta: unknown): ColumnMeta => (meta ?? {}) as ColumnMeta;

function Stocktake() {
  const [rows, setRows] = createSignal<LineNode[]>([]);
  const [error, setError] = createSignal<string | null>(null);
  const [loading, setLoading] = createSignal(true);

  let scrollRef: HTMLDivElement | undefined;

  onMount(async () => {
    try {
      // Variables are checked against StocktakeLines; result type is inferred.
      const data = await graphqlFetch(StocktakeLines, {
        stocktakeId: STOCKTAKE_ID,
        storeId: STORE_ID,
        page: {},
        sort: [{ key: "itemName", desc: false }],
      });
      setRows(data.stocktakeLines.nodes);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  });

  const table = createSolidTable({
    get data() {
      return rows();
    },
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const rowModel = createMemo(() => table.getRowModel().rows);

  const virtualizer = createVirtualizer({
    get count() {
      return rowModel().length;
    },
    getScrollElement: () => scrollRef ?? null,
    estimateSize: () => ROW_HEIGHT,
    overscan: 12,
  });

  return (
    <div class={s.page}>
      <div class={s.topBar}>
        <div class={s.breadcrumb}>
          <span class={s.breadcrumbRoot}>📦 Stocktakes</span>
          <span class={s.breadcrumbSep}>/</span>
          <span class={s.breadcrumbNumber}>{stocktakeMeta.number}</span>
        </div>
        <div class={s.actions}>
          <span class={s.actionButton}>
            <span class={s.actionIcon}>⊕</span> Add item
          </span>
          <span class={s.actionButton}>
            <span class={s.actionIcon}>⤓</span> Export/Print
          </span>
        </div>
      </div>

      <div class={s.subBar}>
        <div class={s.descriptionGroup}>
          <span class={s.descriptionLabel}>Description:</span>
          <span class={s.descriptionValue}>{stocktakeMeta.description}</span>
        </div>
        <div class={s.filterBox}>
          <span>🔍</span>
          <span>Filter items</span>
        </div>
      </div>

      <div class={s.tabs}>
        <span class={`${s.tab} ${s.tabActive}`}>Details</span>
        <span class={s.tab}>Log</span>
      </div>

      <div class={s.tableWrap} ref={scrollRef}>
        <div class={s.table} role="table">
          <div class={s.thead} role="rowgroup">
            <For each={table.getHeaderGroups()}>
              {(headerGroup) => (
                <div class={s.headerRow} role="row">
                  <div class={`${s.th} ${s.checkboxCell}`} role="columnheader">
                    <span class={s.checkbox} />
                  </div>
                  <For each={headerGroup.headers}>
                    {(header) => {
                      const meta = metaOf(header.column.columnDef.meta);
                      return (
                        <div
                          class={`${s.th} ${s.dataCell}${meta.numeric ? ` ${s.numericCell}` : ""}`}
                          role="columnheader"
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                          {meta.sorted ? (
                            <span class={s.sortArrow}>↑</span>
                          ) : null}
                        </div>
                      );
                    }}
                  </For>
                </div>
              )}
            </For>
          </div>

          <div
            class={s.tbody}
            role="rowgroup"
            style={{ height: `${virtualizer.getTotalSize()}px` }}
          >
            <For each={virtualizer.getVirtualItems()}>
              {(virtualRow) => {
                const row = rowModel()[virtualRow.index];
                return (
                  <div
                    class={s.row}
                    role="row"
                    data-even={virtualRow.index % 2 === 1}
                    style={{ transform: `translateY(${virtualRow.start}px)` }}
                  >
                    <div class={`${s.td} ${s.checkboxCell}`} role="cell">
                      <span class={s.checkbox} />
                    </div>
                    <For each={row.getVisibleCells()}>
                      {(cell) => {
                        const meta = metaOf(cell.column.columnDef.meta);
                        return (
                          <div
                            class={`${s.td} ${s.dataCell}${meta.numeric ? ` ${s.numericCell}` : ""}`}
                            role="cell"
                          >
                            <Show
                              when={meta.link}
                              fallback={flexRender(
                                cell.column.columnDef.cell,
                                cell.getContext(),
                              )}
                            >
                              <span class={s.linkCell}>
                                {cell.getValue<string>()}
                              </span>
                            </Show>
                          </div>
                        );
                      }}
                    </For>
                  </div>
                );
              }}
            </For>
          </div>
        </div>

        <Show when={loading()}>
          <div class={s.statusRow}>Loading…</div>
        </Show>
        <Show when={error()}>
          <div class={s.statusRow}>Failed to load: {error()}</div>
        </Show>
      </div>
    </div>
  );
}

export default Stocktake;
