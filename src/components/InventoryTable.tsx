import { useMemo, useState } from 'react';
import type { InventoryItem, BatchStatus } from '../data/inventory';
import './InventoryTable.css';

interface Column {
  key: keyof InventoryItem;
  label: string;
  align?: 'left' | 'right';
  format?: (item: InventoryItem) => string;
}

const COLUMNS: Column[] = [
  { key: 'itemCode', label: 'Item Code' },
  { key: 'itemName', label: 'Item Name' },
  { key: 'batchNumber', label: 'Batch No.' },
  { key: 'category', label: 'Category' },
  {
    key: 'quantityOnHand',
    label: 'Qty on Hand',
    align: 'right',
    format: (i) => i.quantityOnHand.toLocaleString(),
  },
  {
    key: 'unitPrice',
    label: 'Unit Price',
    align: 'right',
    format: (i) => `$${i.unitPrice.toFixed(2)}`,
  },
  { key: 'expiryDate', label: 'Expiry Date' },
  { key: 'location', label: 'Location' },
  { key: 'status', label: 'Status' },
];

const STATUS_CLASS: Record<BatchStatus, string> = {
  'In Stock': 'status status--in',
  'Low Stock': 'status status--low',
  'Out of Stock': 'status status--out',
  Expired: 'status status--expired',
};

interface Props {
  items: InventoryItem[];
}

type SortKey = keyof InventoryItem;
type SortDir = 'asc' | 'desc';

export function InventoryTable({ items }: Props) {
  const [filter, setFilter] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('id');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) =>
        i.itemName.toLowerCase().includes(q) ||
        i.itemCode.toLowerCase().includes(q) ||
        i.batchNumber.toLowerCase().includes(q) ||
        i.category.toLowerCase().includes(q),
    );
  }, [items, filter]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      let cmp: number;
      if (typeof av === 'number' && typeof bv === 'number') cmp = av - bv;
      else cmp = String(av).localeCompare(String(bv));
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return copy;
  }, [filtered, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  return (
    <div className="inventory">
      <div className="inventory__toolbar">
        <h1>Pharmacy Inventory</h1>
        <input
          className="inventory__search"
          type="search"
          placeholder="Search name, code, batch, category…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <span className="inventory__count">
          {sorted.length.toLocaleString()} of {items.length.toLocaleString()} batches
        </span>
      </div>

      <div className="inventory__scroll">
        <table className="inventory__table">
          <thead>
            <tr>
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  className={col.align === 'right' ? 'cell--right' : undefined}
                  onClick={() => toggleSort(col.key)}
                >
                  {col.label}
                  {sortKey === col.key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((item) => (
              <tr key={item.id}>
                {COLUMNS.map((col) => {
                  const value = col.format ? col.format(item) : String(item[col.key]);
                  if (col.key === 'status') {
                    return (
                      <td key={col.key}>
                        <span className={STATUS_CLASS[item.status]}>{item.status}</span>
                      </td>
                    );
                  }
                  return (
                    <td key={col.key} className={col.align === 'right' ? 'cell--right' : undefined}>
                      {value}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
