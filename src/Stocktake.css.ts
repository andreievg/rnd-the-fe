import { style, globalStyle } from "@vanilla-extract/css";
import { vars } from "./theme.css";

export const page = style({
  fontFamily: vars.font.family,
  fontSize: vars.font.sizeBody,
  color: vars.color.text,
  background: vars.color.pageBg,
  padding: "16px 24px",
  boxSizing: "border-box",
  minHeight: "100vh",
});

/* ---- Header: breadcrumb + actions ---- */
export const topBar = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: "16px",
});

export const breadcrumb = style({
  display: "flex",
  alignItems: "center",
  gap: "8px",
  fontSize: "18px",
  fontWeight: vars.font.weightSemibold,
});

export const breadcrumbRoot = style({
  display: "flex",
  alignItems: "center",
  gap: "6px",
  color: vars.color.text,
});

export const breadcrumbSep = style({
  color: vars.color.textMuted,
  fontWeight: vars.font.weightRegular,
});

export const breadcrumbNumber = style({
  color: vars.color.textMuted,
  fontWeight: vars.font.weightRegular,
});

export const actions = style({
  display: "flex",
  gap: "12px",
});

export const actionButton = style({
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  height: "36px",
  padding: "0 16px",
  borderRadius: "24px",
  border: `1px solid ${vars.color.border}`,
  background: vars.color.rowBg,
  color: vars.color.text,
  fontFamily: vars.font.family,
  fontSize: vars.font.sizeBody,
  fontWeight: vars.font.weightRegular,
  cursor: "default",
});

export const actionIcon = style({
  color: vars.color.primary,
  fontSize: "16px",
  lineHeight: 1,
});

/* ---- Sub bar: description + filter ---- */
export const subBar = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: "8px",
});

export const descriptionGroup = style({
  display: "flex",
  alignItems: "center",
  gap: "12px",
});

export const descriptionLabel = style({
  fontWeight: vars.font.weightSemibold,
});

export const descriptionValue = style({
  background: vars.color.rowAltBg,
  border: `1px solid ${vars.color.border}`,
  borderRadius: "8px",
  padding: "8px 12px",
  minWidth: "260px",
  color: vars.color.text,
});

export const filterBox = style({
  display: "flex",
  alignItems: "center",
  gap: "8px",
  border: `1px solid ${vars.color.border}`,
  borderRadius: "8px",
  padding: "8px 12px",
  minWidth: "220px",
  color: vars.color.textMuted,
  background: vars.color.rowBg,
});

/* ---- Tabs ---- */
export const tabs = style({
  display: "flex",
  justifyContent: "center",
  gap: "32px",
  borderBottom: `1px solid ${vars.color.border}`,
  marginBottom: "0",
});

export const tab = style({
  padding: "10px 4px",
  color: vars.color.textMuted,
  fontWeight: vars.font.weightSemibold,
  borderBottom: "2px solid transparent",
});

export const tabActive = style({
  color: vars.color.primary,
  borderBottomColor: vars.color.primary,
});

/* ---- Table ----
 *
 * The wrapper is the scroll container the virtualizer measures. It scrolls on
 * both axes (rows vertically, wide column set horizontally). The <tbody> is
 * given the full virtual height and each row is absolutely positioned with a
 * transform, so only the visible slice of ~1.5k rows is ever in the DOM.
 *
 * Because rows are taken out of normal table flow, the table, header row, and
 * body rows all use `display: grid` with a shared column template so cells
 * still line up across the sticky header and the positioned rows.
 */
export const tableWrap = style({
  position: "relative",
  height: "70vh",
  overflow: "auto",
  background: vars.color.rowBg,
  borderBottom: `1px solid ${vars.color.border}`,
  contain: "strict",
});

export const table = style({
  display: "grid",
  fontFamily: vars.font.family,
  fontSize: vars.font.sizeBody,
  whiteSpace: "nowrap",
});

export const thead = style({
  display: "grid",
  position: "sticky",
  top: 0,
  zIndex: 1,
});

export const headerRow = style({
  display: "flex",
  width: "max-content",
  minWidth: "100%",
});

export const tbody = style({
  display: "grid",
  position: "relative",
});

export const th = style({
  display: "flex",
  alignItems: "center",
  background: vars.color.headerBg,
  textAlign: "left",
  fontSize: vars.font.sizeHeader,
  fontWeight: vars.font.weightSemibold,
  color: vars.color.text,
  padding: `${vars.space.headerY} ${vars.space.cellX}`,
  paddingRight: "16px",
  borderBottom: `1px solid ${vars.color.headerBorder}`,
  boxSizing: "border-box",
});

export const thSortable = style({
  cursor: "default",
});

export const sortArrow = style({
  marginLeft: "4px",
  color: vars.color.textMuted,
  fontSize: "11px",
});

export const td = style({
  display: "flex",
  alignItems: "center",
  padding: `${vars.space.cellY} ${vars.space.cellX}`,
  borderBottom: `1px solid ${vars.color.border}`,
  boxSizing: "border-box",
  color: vars.color.text,
  overflow: "hidden",
  textOverflow: "ellipsis",
});

/**
 * Rows are lifted out of table flow and positioned by the virtualizer, so
 * :nth-child can't drive zebra striping (only the visible slice is mounted and
 * its child order doesn't track the real row index). Instead we key striping
 * and hover off a `data-even` attribute the component sets from the row index.
 */
export const row = style({
  display: "flex",
  position: "absolute",
  top: 0,
  left: 0,
  width: "max-content",
  minWidth: "100%",
  height: vars.space.rowHeight,
  background: vars.color.rowBg,
  selectors: {
    "&[data-even='true']": {
      background: vars.color.rowAltBg,
    },
    "&:hover": {
      background: vars.color.rowHoverBg,
    },
  },
});

export const linkCell = style({
  color: vars.color.link,
  textDecoration: "none",
  cursor: "default",
});

export const checkboxCell = style({
  flex: "0 0 40px",
  width: "40px",
  paddingLeft: "16px",
});

/** Fixed-width data cell; keeps header and body columns aligned in flex rows. */
export const dataCell = style({
  flex: "0 0 auto",
  width: "160px",
});

export const checkbox = style({
  width: "16px",
  height: "16px",
  border: `1.5px solid ${vars.color.border}`,
  borderRadius: "3px",
  background: vars.color.rowBg,
  display: "inline-block",
  boxSizing: "border-box",
});

export const numericCell = style({
  justifyContent: "flex-end",
  textAlign: "right",
});

export const statusRow = style({
  padding: "16px",
  color: vars.color.textMuted,
  fontSize: vars.font.sizeBody,
});

/* Reset default margins on host page */
globalStyle("body", {
  margin: 0,
});
