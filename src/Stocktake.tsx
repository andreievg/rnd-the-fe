import { For } from "solid-js";
import * as s from "./Stocktake.css";
import { stocktakeLines, stocktakeMeta } from "./stocktakeData";

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

function Stocktake() {
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
            <For each={stocktakeLines}>
              {(line) => (
                <tr class={s.row}>
                  <td class={`${s.td} ${s.checkboxCell}`}>
                    <span class={s.checkbox} />
                  </td>
                  <For each={columns}>
                    {(col) => {
                      const value = line[col.key];
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
              )}
            </For>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Stocktake;
