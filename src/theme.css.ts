import { createGlobalTheme } from "@vanilla-extract/css";

/**
 * Design tokens lifted from the live Open mSupply stocktake page
 * (computed styles captured from the MUI table).
 */
export const vars = createGlobalTheme(":root", {
  font: {
    family: '"Inter", "Inter Variable", system-ui, -apple-system, sans-serif',
    sizeBody: "14px",
    sizeHeader: "12.6px",
    weightRegular: "400",
    weightSemibold: "600",
  },
  color: {
    text: "rgba(0, 0, 0, 0.87)",
    textMuted: "rgba(0, 0, 0, 0.6)",
    link: "rgb(91, 141, 239)",
    headerBg: "rgb(255, 255, 255)",
    rowBg: "rgb(255, 255, 255)",
    rowAltBg: "rgb(250, 250, 252)",
    rowHoverBg: "rgb(245, 247, 252)",
    border: "rgb(228, 228, 235)",
    headerBorder: "rgb(238, 238, 242)",
    pageBg: "rgb(252, 252, 252)",
    primary: "rgb(91, 141, 239)",
  },
  space: {
    cellY: "5.6px",
    cellX: "8px",
    headerY: "12px",
    rowHeight: "52px",
  },
});
