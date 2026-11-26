import type {
  ColumnDefinition,
  FilterChangedEvent,
  FilteringOptions,
  GetRowId,
  GridReadyEvent,
  GridState,
  PaginationChangedEvent,
  PaginationOptions,
  RowData,
  RowDataChangedEvent,
  SelectionChangedEvent,
  SelectionOptions,
  SortChangedEvent,
  SortingOptions,
} from '@inno-grid/mygrid-core';
import type { ReactNode } from 'react';

/** Names match `@inno-grid/mygrid-themes` theme selectors. */
export type MyGridTheme = 'light' | 'dark';

/** Names match `@inno-grid/mygrid-themes` density selectors. */
export type MyGridDensity = 'compact' | 'default' | 'comfortable';

/** Which filter editor a column shows. Matching stays in the core. */
export type MyGridFilterKind = 'text' | 'number';

/** What the React view mounted for the current scroll position. */
export interface MyGridVirtualMetrics {
  readonly totalRows: number;
  readonly renderedRows: number;
  readonly totalColumns: number;
  readonly renderedColumns: number;
  readonly scrollTop: number;
  readonly scrollLeft: number;
}

/**
 * Props for {@link MyGrid}.
 * `columnDefs` turns the mount into a data grid. Without it, the component renders `children` only.
 * Page indexes passed to the core stay zero-based. The footer shows the same page as a 1-based label.
 */
export interface MyGridProps<TData extends RowData = RowData, TContext = unknown> {
  className?: string;
  children?: ReactNode;
  /** Sets `data-mygrid-theme` when the themes stylesheet is loaded. */
  theme?: MyGridTheme;
  /** Sets `data-mygrid-density` when the themes stylesheet is loaded. */
  density?: MyGridDensity;
  /** Column definitions. Omit them to keep the mount-only root. */
  columnDefs?: readonly ColumnDefinition<TData>[];
  /** Source rows. The core keeps this list in source order. */
  rowData?: readonly TData[];
  /** Stable id function. Read when the grid is created. */
  getRowId?: GetRowId<TData>;
  /** Host context stored by the core. It is not serialized. */
  context?: TContext;
  /** Sort defaults read when the grid is created. */
  sorting?: SortingOptions;
  /** Filter defaults read when the grid is created. */
  filtering?: FilteringOptions;
  /** Page window read when the grid is created. Disabled unless `enabled` is true. */
  pagination?: PaginationOptions;
  /** Selection mode read when the grid is created. Defaults to multiple. */
  selection?: SelectionOptions;
  /**
   * Snapshot applied once after the grid is created.
   * Later prop updates do not reapply it.
   */
  initialState?: GridState<TData>;
  /** Column ids that show a number editor. Other filterable columns show a text editor. */
  numberFilterColumns?: readonly string[];
  /** Shows a loading row and sets `aria-busy`. */
  loading?: boolean;
  /** Overrides `--mygrid-row-height` in pixels. */
  rowHeight?: number;
  /** Overrides `--mygrid-header-height` in pixels. */
  headerHeight?: number;
  /** CSS width of the root. Defaults to the available width. */
  width?: number | string;
  /** CSS height of the root. The body scrolls inside it. */
  height?: number | string;
  /**
   * Modifier that adds a column to the sort instead of replacing it.
   * `ctrl` also treats the meta key as the modifier. Defaults to `ctrl`.
   */
  multiSortKey?: 'ctrl' | 'shift';
  /** Accessible name for the table. Defaults to "Data grid". */
  label?: string;
  /**
   * Extra rows mounted above and below the viewport.
   * Defaults to 6. Ignored when `virtualizeRows` is false.
   */
  rowOverscan?: number;
  /**
   * Extra center columns mounted on each side of the viewport.
   * Defaults to 2. Pinned columns stay mounted. Ignored when `virtualizeColumns` is false.
   */
  columnOverscan?: number;
  /** When false, every row on the current page is mounted. Defaults to true. */
  virtualizeRows?: boolean;
  /** When false, every visible column is mounted. Defaults to true. */
  virtualizeColumns?: boolean;
  /** Fired after the mounted window changes. Scroll updates are folded into one frame. */
  onVirtualMetrics?: (metrics: MyGridVirtualMetrics) => void;
  /** Called with the live core API after the grid is created. */
  onGridReady?: (event: GridReadyEvent<TData, TContext>) => void;
  onRowDataChanged?: (event: RowDataChangedEvent<TData, TContext>) => void;
  onSortChanged?: (event: SortChangedEvent<TData, TContext>) => void;
  onFilterChanged?: (event: FilterChangedEvent<TData, TContext>) => void;
  onPaginationChanged?: (event: PaginationChangedEvent<TData, TContext>) => void;
  onSelectionChanged?: (event: SelectionChangedEvent<TData, TContext>) => void;
}
