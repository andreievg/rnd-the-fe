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

/* ---- Table ---- */
export const tableWrap = style({
  background: vars.color.rowBg,
  overflowX: "auto",
  borderBottom: `1px solid ${vars.color.border}`,
});

export const table = style({
  width: "100%",
  borderCollapse: "separate",
  borderSpacing: 0,
  fontFamily: vars.font.family,
  fontSize: vars.font.sizeBody,
  whiteSpace: "nowrap",
});

export const th = style({
  position: "sticky",
  top: 0,
  zIndex: 1,
  background: vars.color.headerBg,
  textAlign: "left",
  fontSize: vars.font.sizeHeader,
  fontWeight: vars.font.weightSemibold,
  color: vars.color.text,
  padding: `${vars.space.headerY} ${vars.space.cellX}`,
  paddingRight: "16px",
  borderBottom: `1px solid ${vars.color.headerBorder}`,
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
  padding: `${vars.space.cellY} ${vars.space.cellX}`,
  borderBottom: `1px solid ${vars.color.border}`,
  height: vars.space.rowHeight,
  boxSizing: "border-box",
  verticalAlign: "middle",
  color: vars.color.text,
});

export const row = style({
  selectors: {
    "&:nth-child(odd)": {
      background: vars.color.rowAltBg,
    },
    "&:nth-child(even)": {
      background: vars.color.rowBg,
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
  width: "40px",
  paddingLeft: "16px",
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
