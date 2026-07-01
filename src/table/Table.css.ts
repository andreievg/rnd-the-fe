import { style, styleVariants } from "@vanilla-extract/css";
import { vars } from "../theme.css";

export const wrap = style({
  background: vars.color.rowBg,
  overflowX: "auto",
  overflowY: "auto",
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

export const td = style({
  padding: `${vars.space.cellY} ${vars.space.cellX}`,
  borderBottom: `1px solid ${vars.color.border}`,
  height: vars.space.rowHeight,
  boxSizing: "border-box",
  verticalAlign: "middle",
  color: vars.color.text,
});

export const align = styleVariants({
  left: { textAlign: "left" },
  right: { textAlign: "right" },
  center: { textAlign: "center" },
});

export const row = style({
  selectors: {
    "&:nth-child(odd)": { background: vars.color.rowAltBg },
    "&:nth-child(even)": { background: vars.color.rowBg },
    "&:hover": { background: vars.color.rowHoverBg },
  },
});

export const statusRow = style({
  padding: "16px",
  color: vars.color.textMuted,
  fontSize: vars.font.sizeBody,
});

/* ---- Header helpers ---- */
export const headerText = style({
  fontSize: vars.font.sizeHeader,
  fontWeight: vars.font.weightSemibold,
  color: vars.color.text,
});

/* ---- Cell helpers ---- */
export const linkCell = style({
  color: vars.color.link,
  textDecoration: "none",
  cursor: "default",
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
