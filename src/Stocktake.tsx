import { For, Show, createSignal, onMount } from "solid-js";
import * as s from "./Stocktake.css";
import { stocktakeMeta } from "./stocktakeData";
import { graphqlFetch } from "./graphql";
import { StocktakeLines, type StocktakeLinesResult } from "./stocktakeLines.generated";

// Hardcoded for this step — render just the table (no filters / URL parsing yet).
const STOCKTAKE_ID = "019f17d0-1444-795c-ac53-da2216c73cff";
const STORE_ID = "5B28901C52396E4BB098B9862CCF5DF9";

// A single line node straight from the generated GraphQL result type.
type LineNode =
  StocktakeLinesResult["stocktakeLines"]["nodes"][number];

const columns = [
  { key: "code", label: "Code", sortable: true },
  { key: "name", label: "Name", sortable: true, sorted: "asc" as const },
  { key: "batch", label: "Batch", sortable: true },
  { key: "expiryDate", label: "Expiry date", sortable: true },
  { key: "manufactureDate", label: "Manufacture date", sortable: true },
  { key: "location", label: "Location" },
  { key: "unitName", label: "Unit name", sortable: true },
  { key: "packSize", label: "Pack size" },
  { key: "packsSnapshot", label: "Packs snapshot", sortable: true, numeric: true },
  { key: "packsCounted", label: "Packs counted", sortable: true, numeric: true },
  { key: "difference", label: "Difference", numeric: true },
  { key: "reason", label: "Reason", sortable: true },
  { key: "manufacturer", label: "Manufacturer" },
] as const;

type ColumnKey = (typeof columns)[number]["key"];

const dash = (v: string | null | undefined) => (v == null || v === "" ? "" : v);
const numOrDash = (v: number | null | undefined) =>
  v == null ? "-" : String(v);

/** Flatten a GraphQL line node into the table's cell values. */
function toCells(line: LineNode): Record<ColumnKey, string> {
  const snapshot = line.snapshotNumberOfPacks;
  const counted = line.countedNumberOfPacks;
  const difference =
    counted == null ? "-" : String(counted - snapshot);
  return {
    code: line.item.code,
    name: line.itemName,
    batch: dash(line.batch),
    expiryDate: dash(line.expiryDate),
    manufactureDate: dash(line.manufactureDate),
    location: dash(line.location?.name),
    unitName: dash(line.item.unitName),
    packSize: numOrDash(line.packSize),
    packsSnapshot: String(snapshot),
    packsCounted: counted == null ? "" : String(counted),
    difference,
    reason: dash(line.reasonOption?.reason),
    manufacturer: dash(line.manufacturer?.name),
  };
}

function Stocktake() {
  const [rows, setRows] = createSignal<LineNode[]>([]);
  const [error, setError] = createSignal<string | null>(null);
  const [loading, setLoading] = createSignal(true);

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

      <div class={s.tableWrap}>
        <table class={s.table}>
          <thead>
            <tr>
              <th class={`${s.th} ${s.checkboxCell}`}>
                <span class={s.checkbox} />
              </th>
              <For each={columns}>
                {(col) => (
                  <th
                    class={`${s.th}${"sortable" in col && col.sortable ? ` ${s.thSortable}` : ""}`}
                  >
                    {col.label}
                    {"sorted" in col && col.sorted ? (
                      <span class={s.sortArrow}>↑</span>
                    ) : null}
                  </th>
                )}
              </For>
            </tr>
          </thead>
          <tbody>
            <For each={rows()}>
              {(line) => {
                const cells = toCells(line);
                return (
                  <tr class={s.row}>
                    <td class={`${s.td} ${s.checkboxCell}`}>
                      <span class={s.checkbox} />
                    </td>
                    <For each={columns}>
                      {(col) => {
                        const value = cells[col.key];
                        const isLink = col.key === "code" || col.key === "name";
                        const numeric = "numeric" in col && col.numeric;
                        return (
                          <td class={`${s.td}${numeric ? ` ${s.numericCell}` : ""}`}>
                            {isLink ? (
                              <span class={s.linkCell}>{value}</span>
                            ) : (
                              value
                            )}
                          </td>
                        );
                      }}
                    </For>
                  </tr>
                );
              }}
            </For>
          </tbody>
        </table>

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
