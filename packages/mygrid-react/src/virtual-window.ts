/** Rows kept mounted above and below the viewport when `rowOverscan` is omitted. */
export const DEFAULT_ROW_OVERSCAN = 6;

/** Columns kept mounted on each side of the viewport when `columnOverscan` is omitted. */
export const DEFAULT_COLUMN_OVERSCAN = 2;

/** Used when a column has no width and the host has not measured a row. */
export const DEFAULT_ROW_HEIGHT = 40;

export const DEFAULT_HEADER_HEIGHT = 44;

export const DEFAULT_COLUMN_WIDTH = 160;

export const SELECTION_COLUMN_WIDTH = 44;

/** Viewport used before the scroll container has a layout size. */
export const FALLBACK_VIEWPORT_HEIGHT = 400;

export const FALLBACK_VIEWPORT_WIDTH = 1200;

export interface RowWindow {
  /** First rendered row, inclusive. */
  readonly start: number;
  /** Last rendered row, exclusive. */
  readonly end: number;
}

export interface SizedColumn {
  readonly colId: string;
  readonly width: number;
  readonly pinned: 'left' | 'right' | null;
}

export interface ColumnWindow {
  readonly left: readonly SizedColumn[];
  readonly center: readonly SizedColumn[];
  readonly right: readonly SizedColumn[];
  readonly leftSpacer: number;
  readonly rightSpacer: number;
  readonly totalWidth: number;
  readonly renderedCount: number;
}

export function resolvedColumnWidth(column: {
  readonly width: number | null;
  readonly minWidth: number | null;
  readonly maxWidth: number | null;
}): number {
  let width = column.width ?? DEFAULT_COLUMN_WIDTH;
  if (column.minWidth !== null) {
    width = Math.max(width, column.minWidth);
  }
  if (column.maxWidth !== null) {
    width = Math.min(width, column.maxWidth);
  }
  return Math.max(0, width);
}

/**
 * Rows whose boxes overlap the scroll viewport, plus overscan.
 * Row `i` occupies `[headerHeight + i * rowHeight, headerHeight + (i + 1) * rowHeight)`.
 */
export function rowWindow(
  scrollTop: number,
  viewportHeight: number,
  headerHeight: number,
  rowHeight: number,
  count: number,
  overscan: number,
): RowWindow {
  if (count <= 0) {
    return { start: 0, end: 0 };
  }
  const size = rowHeight > 0 ? rowHeight : DEFAULT_ROW_HEIGHT;
  const view = viewportHeight > 0 ? viewportHeight : FALLBACK_VIEWPORT_HEIGHT;
  const header = headerHeight > 0 ? headerHeight : 0;
  const extra = overscan > 0 ? Math.floor(overscan) : 0;
  const firstVisible = Math.max(0, Math.floor((scrollTop - header) / size));
  const lastVisible = Math.max(firstVisible, Math.ceil((scrollTop + view - header) / size) - 1);
  return {
    start: Math.max(0, firstVisible - extra),
    end: Math.min(count, lastVisible + 1 + extra),
  };
}

/**
 * Pinned columns stay mounted. Center columns are clipped to the horizontal viewport.
 * Spacer widths are the center columns that are not mounted.
 */
export function columnWindow(
  columns: readonly SizedColumn[],
  scrollLeft: number,
  viewportWidth: number,
  overscan: number,
  selectionWidth: number,
): ColumnWindow {
  const left: SizedColumn[] = [];
  const center: SizedColumn[] = [];
  const right: SizedColumn[] = [];
  for (const column of columns) {
    if (column.pinned === 'left') {
      left.push(column);
    } else if (column.pinned === 'right') {
      right.push(column);
    } else {
      center.push(column);
    }
  }
  const prefix: number[] = [0];
  for (const column of center) {
    prefix.push((prefix[prefix.length - 1] ?? 0) + column.width);
  }
  const centerWidth = prefix[prefix.length - 1] ?? 0;
  const leftWidth = selectionWidth + sumWidth(left);
  const totalWidth = leftWidth + centerWidth + sumWidth(right);
  const extra = overscan > 0 ? Math.floor(overscan) : 0;
  if (center.length === 0) {
    return {
      left,
      center,
      right,
      leftSpacer: 0,
      rightSpacer: 0,
      totalWidth,
      renderedCount: left.length + right.length,
    };
  }
  const view = viewportWidth > 0 ? viewportWidth : FALLBACK_VIEWPORT_WIDTH;
  const viewStart = Math.max(0, scrollLeft);
  const viewEnd = viewStart + view;
  let first = center.length;
  let last = -1;
  for (let index = 0; index < center.length; index += 1) {
    const start = leftWidth + (prefix[index] ?? 0);
    const end = leftWidth + (prefix[index + 1] ?? start);
    if (end > viewStart && start < viewEnd) {
      if (index < first) {
        first = index;
      }
      last = index;
    }
  }
  if (last < 0) {
    first = viewStart <= leftWidth ? 0 : center.length - 1;
    last = first;
  }
  const start = Math.max(0, first - extra);
  const end = Math.min(center.length, last + 1 + extra);
  return {
    left,
    center: center.slice(start, end),
    right,
    leftSpacer: prefix[start] ?? 0,
    rightSpacer: centerWidth - (prefix[end] ?? centerWidth),
    totalWidth,
    renderedCount: left.length + (end - start) + right.length,
  };
}

function sumWidth(columns: readonly SizedColumn[]): number {
  let total = 0;
  for (const column of columns) {
    total += column.width;
  }
  return total;
}
