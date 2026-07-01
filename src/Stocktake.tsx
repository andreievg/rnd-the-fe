import { For, Show, createSignal, onMount } from 'solid-js';
import { createStore, produce } from 'solid-js/store';
import * as s from './Stocktake.css';
import { stocktakeMeta } from './stocktakeData';
import { graphqlFetch } from './graphql';
import { StocktakeLines, type StocktakeLinesResult } from './stocktakeLines.generated';
import {
  Table,
  defineColumns,
  textHeader,
  TextCell,
  NumberCell,
  LinkCell,
} from './table';
import type { CellProps } from './table';

// Hardcoded for this step — render just the table (no filters / URL parsing yet).
const STOCKTAKE_ID = '019f17d0-1444-795c-ac53-da2216c73cff';
const STORE_ID = '5B28901C52396E4BB098B9862CCF5DF9';

// A single line node straight from the generated GraphQL result type.
type LineNode = StocktakeLinesResult['stocktakeLines']['nodes'][number];

// Row = server node + local editable fields kept in the store. Editing writes
// back to these fields (fine-grained, so only the edited cell re-renders); the
// nested-in-GraphQL values (location/reason/manufacturer) are flattened here so
// the dropdown writes stay trivial. Nothing is persisted (no mutation yet).
type Row = LineNode & {
  selected: boolean;
  // Editable copies (seeded from the server values on load).
  batchEdit: string;
  expiryDateEdit: string;
  manufactureDateEdit: string;
  locationEdit: string;
  packSizeEdit: number | null;
  countedEdit: number | null;
  reasonEdit: string;
  manufacturerEdit: string;
};

// Keys of Row whose value type is assignable to V — lets the editable-cell
// factories accept only fields of the right type (string / number | null).
type KeysOfType<T, V> = { [K in keyof T]-?: T[K] extends V ? K : never }[keyof T];

// Hardcoded dropdown options (sample data for now).
const LOCATION_OPTIONS = ['A1', 'A2', 'B1', 'B2', 'Cold room', 'Quarantine'];
const REASON_OPTIONS = ['Stock count', 'Damaged', 'Expired', 'Correction', 'Lost'];
const MANUFACTURER_OPTIONS = ['Shimadzu', 'Pfizer', 'Roche', 'Novartis', 'Generic'];

function toRow(n: LineNode): Row {
  return {
    ...n,
    selected: false,
    batchEdit: n.batch ?? '',
    expiryDateEdit: n.expiryDate ?? '',
    manufactureDateEdit: n.manufactureDate ?? '',
    locationEdit: n.location?.name ?? '',
    packSizeEdit: n.packSize,
    countedEdit: n.countedNumberOfPacks,
    reasonEdit: n.reasonOption?.reason ?? '',
    manufacturerEdit: n.manufacturer?.name ?? '',
  };
}

/**
 * Difference = counted - snapshot, recomputed live from the edited counted value.
 * A composite cell bound to Row (reads the whole row).
 */
function DifferenceCell(props: CellProps<undefined, Row>) {
  const value = () =>
    props.row.countedEdit == null
      ? null
      : props.row.countedEdit - props.row.snapshotNumberOfPacks;
  return <NumberCell value={value()} row={props.row} />;
}

// Infinite scroll: fetch a page of this size, then the next once the user
// scrolls past the halfway point of what's currently loaded, and so on.
const CHUNK = 100;
// Fetch when scroll passes this fraction of the loaded content.
const LOAD_AT_FRACTION = 0.5;

function Stocktake() {
  // Rows live in a store so appends are a fine-grained structural change: a
  // keyed <For> mounts only the new rows and leaves existing row DOM untouched.
  const [state, setState] = createStore<{ rows: Row[] }>({ rows: [] });
  const [total, setTotal] = createSignal<number | null>(null);
  const [error, setError] = createSignal<string | null>(null);
  // true while a chunk is in flight.
  const [loadingMore, setLoadingMore] = createSignal(false);

  const selectedCount = () => state.rows.filter((r) => r.selected).length;

  const hasMore = () => {
    const t = total();
    return t == null || state.rows.length < t;
  };

  // Toggle a row's selection by id — a fine-grained store write, so only that
  // row's checkbox re-renders. The index comes straight from <For> (via the
  // cell's props.rowIndex, kept current by Solid across splices) so there's no
  // per-event O(n) scan to recover it.
  const toggleRow = (i: number) => {
    setState('rows', i, 'selected', (v) => !v);
  };

  // Remove selected rows by splicing them out in place (produce). Surviving row
  // proxies keep their identity, so the keyed <For> only unmounts the deleted
  // rows and never re-renders the rest.
  const deleteSelected = () => {
    const removed = selectedCount();
    if (removed === 0) return;
    setState(
      'rows',
      produce((rows) => {
        for (let i = rows.length - 1; i >= 0; i--) {
          if (rows[i].selected) rows.splice(i, 1);
        }
      }),
    );
    // Reduce the known total so infinite scroll still targets the right count.
    setTotal((t) => (t == null ? t : t - removed));
  };

  // Selection checkbox bound to Row: reads row.selected, toggles via the store.
  function SelectionCell(props: CellProps<undefined, Row>) {
    return (
      <input
        type="checkbox"
        class={s.rowCheckbox}
        checked={props.row.selected}
        onChange={() => toggleRow(props.rowIndex)}
      />
    );
  }

  // Write an editable field back to the store by array index — fine-grained, so
  // only that cell (and any dependent, e.g. Difference) re-renders. The index is
  // the cell's props.rowIndex from <For> (no O(n) lookup per keystroke).
  const setField = <K extends keyof Row>(i: number, field: K, value: Row[K]) => {
    setState('rows', i, field, value as never);
  };

  // Editable-cell factories bound to Row. Each returns a per-table cell (no
  // accessor) that reads/writes one editable field.
  const textInput = (field: KeysOfType<Row, string>) => (props: CellProps<undefined, Row>) =>
    (
      <input
        type="text"
        class={s.editInput}
        value={props.row[field]}
        onInput={(e) => setField(props.rowIndex, field, e.currentTarget.value)}
      />
    );

  const dateInput = (field: KeysOfType<Row, string>) => (props: CellProps<undefined, Row>) =>
    (
      <input
        type="date"
        class={s.editInput}
        value={props.row[field]}
        onInput={(e) => setField(props.rowIndex, field, e.currentTarget.value)}
      />
    );

  const numberInput = (field: KeysOfType<Row, number | null>) => (props: CellProps<undefined, Row>) =>
    (
      <input
        type="number"
        class={`${s.editInput} ${s.editNumber}`}
        value={props.row[field] ?? ''}
        onInput={(e) => {
          const v = e.currentTarget.value;
          setField(props.rowIndex, field, v === '' ? null : Number(v));
        }}
      />
    );

  const selectInput =
    (field: KeysOfType<Row, string>, options: readonly string[]) =>
    (props: CellProps<undefined, Row>) =>
      (
        <select
          class={s.editSelect}
          value={props.row[field]}
          onChange={(e) => setField(props.rowIndex, field, e.currentTarget.value)}
        >
          <option value="">—</option>
          <For each={options}>{(opt) => <option value={opt}>{opt}</option>}</For>
        </select>
      );

  const columns = defineColumns<Row>()([
    { header: textHeader(''), cell: SelectionCell },
    { accessor: (row) => row.item.code, header: textHeader('Code'), cell: LinkCell },
    { accessor: (row) => row.itemName, header: textHeader('Name'), cell: LinkCell },
    { header: textHeader('Batch'), cell: textInput('batchEdit') },
    { header: textHeader('Expiry date'), cell: dateInput('expiryDateEdit') },
    { header: textHeader('Manufacture date'), cell: dateInput('manufactureDateEdit') },
    { header: textHeader('Location'), cell: selectInput('locationEdit', LOCATION_OPTIONS) },
    { accessor: (row) => row.item.unitName, header: textHeader('Unit name'), cell: TextCell },
    { header: textHeader('Pack size'), cell: numberInput('packSizeEdit'), align: 'right' },
    {
      accessor: (row) => row.snapshotNumberOfPacks,
      header: textHeader('Packs snapshot'),
      cell: NumberCell,
      align: 'right',
    },
    { header: textHeader('Packs counted'), cell: numberInput('countedEdit'), align: 'right' },
    { header: textHeader('Difference'), cell: DifferenceCell, align: 'right' },
    { header: textHeader('Reason'), cell: selectInput('reasonEdit', REASON_OPTIONS) },
    {
      header: textHeader('Manufacturer'),
      cell: selectInput('manufacturerEdit', MANUFACTURER_OPTIONS),
    },
  ]);

  // Fetch and append the next CHUNK. Guarded so overlapping scroll events and
  // the initial load never issue concurrent or redundant requests.
  const loadMore = async () => {
    if (loadingMore() || error() || !hasMore()) return;
    setLoadingMore(true);
    try {
      const data = await graphqlFetch(StocktakeLines, {
        stocktakeId: STOCKTAKE_ID,
        storeId: STORE_ID,
        page: { offset: state.rows.length, first: CHUNK },
        sort: [{ key: 'itemName', desc: false }],
      });
      setTotal(data.stocktakeLines.totalCount);
      const chunk = data.stocktakeLines.nodes.map(toRow);
      setState('rows', produce((rows) => rows.push(...chunk)));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoadingMore(false);
    }
  };

  // Initial page.
  onMount(loadMore);

  // Trigger the next page once the viewport has scrolled past LOAD_AT_FRACTION
  // of all currently-loaded content. As rows append, scrollHeight grows and the
  // threshold effectively moves down, so it re-arms for each subsequent page.
  const handleScroll = (m: {
    scrollTop: number;
    scrollHeight: number;
    clientHeight: number;
  }) => {
    if (m.scrollHeight <= m.clientHeight) return;
    const scrolledFraction = (m.scrollTop + m.clientHeight) / m.scrollHeight;
    if (scrolledFraction >= LOAD_AT_FRACTION) void loadMore();
  };

  // Indicator shown at the bottom of the list.
  const listStatus = () => {
    if (error()) return `Failed to load: ${error()}`;
    if (loadingMore() && hasMore()) {
      const t = total();
      return t == null
        ? 'Loading…'
        : `Loading ${state.rows.length} / ${t}…`;
    }
    return undefined;
  };

  return (
    <div class={s.page}>
      <div class={s.topBar}>
        <div class={s.breadcrumb}>
          <span class={s.breadcrumbRoot}>📦 Stocktakes</span>
          <span class={s.breadcrumbSep}>/</span>
          <span class={s.breadcrumbNumber}>{stocktakeMeta.number}</span>
        </div>
        <div class={s.actions}>
          {/* Shown only when rows are selected. */}
          <Show when={selectedCount() > 0}>
            <button type="button" class={s.deleteButton} onClick={deleteSelected}>
              🗑 Delete ({selectedCount()})
            </button>
          </Show>
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
          {/* Page-level loading indicator. */}
          <Show when={loadingMore() && hasMore()}>
            <span class={s.loadingChip}>
              <span class={s.spinner} aria-hidden="true" />
              Loading {state.rows.length}
              <Show when={total() != null}> / {total()}</Show>
            </span>
          </Show>
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

      <Table
        data={state.rows}
        columns={columns}
        getRowId={(r) => r.id}
        status={listStatus()}
        onScroll={handleScroll}
      />
    </div>
  );
}

export default Stocktake;
