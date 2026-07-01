import { Show, createSignal, onMount } from 'solid-js';
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
  CheckboxCell,
} from './table';
import type { CellProps } from './table';

// Hardcoded for this step — render just the table (no filters / URL parsing yet).
const STOCKTAKE_ID = '019f17d0-1444-795c-ac53-da2216c73cff';
const STORE_ID = '5B28901C52396E4BB098B9862CCF5DF9';

// A single line node straight from the generated GraphQL result type.
type LineNode = StocktakeLinesResult['stocktakeLines']['nodes'][number];

/**
 * Composite cell bound to LineNode: no accessor, computes from the whole row.
 * A per-table cell reads `row` as its concrete type (unlike the reusable
 * prebuilt cells, which key off `value` only).
 */
function DifferenceCell(props: CellProps<undefined, LineNode>) {
  const value = () =>
    props.row.countedNumberOfPacks == null
      ? null
      : props.row.countedNumberOfPacks - props.row.snapshotNumberOfPacks;
  return <NumberCell value={value()} row={props.row} />;
}

// Columns: `cell` is a component you import & use; `value` is typed per accessor.
const columns = defineColumns<LineNode>()([
  { header: textHeader(''), cell: CheckboxCell },
  { accessor: (row) => row.item.code, header: textHeader('Code'), cell: LinkCell },
  { accessor: (row) => row.itemName, header: textHeader('Name'), cell: LinkCell },
  { accessor: (row) => row.batch, header: textHeader('Batch'), cell: TextCell },
  { accessor: (row) => row.expiryDate, header: textHeader('Expiry date'), cell: TextCell },
  {
    accessor: (row) => row.manufactureDate,
    header: textHeader('Manufacture date'),
    cell: TextCell,
  },
  { accessor: (row) => row.location?.name ?? null, header: textHeader('Location'), cell: TextCell },
  { accessor: (row) => row.item.unitName, header: textHeader('Unit name'), cell: TextCell },
  {
    accessor: (row) => row.packSize,
    header: textHeader('Pack size'),
    cell: NumberCell,
    align: 'right',
  },
  {
    accessor: (row) => row.snapshotNumberOfPacks,
    header: textHeader('Packs snapshot'),
    cell: NumberCell,
    align: 'right',
  },
  {
    accessor: (row) => row.countedNumberOfPacks,
    header: textHeader('Packs counted'),
    cell: NumberCell,
    align: 'right',
  },
  { header: textHeader('Difference'), cell: DifferenceCell, align: 'right' },
  {
    accessor: (row) => row.reasonOption?.reason ?? null,
    header: textHeader('Reason'),
    cell: TextCell,
  },
  {
    accessor: (row) => row.manufacturer?.name ?? null,
    header: textHeader('Manufacturer'),
    cell: TextCell,
  },
]);

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
        sort: [{ key: 'itemName', desc: false }],
      });
      setRows(data.stocktakeLines.nodes);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  });

  const status = () => {
    if (loading()) return 'Loading…';
    if (error()) return `Failed to load: ${error()}`;
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

      <Table data={rows()} columns={columns} getRowId={(r) => r.id} status={status()} />
    </div>
  );
}

export default Stocktake;
