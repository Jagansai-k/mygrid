import { type GRID_STATE_FORMAT_VERSION } from './format';

/**
 * A row is a plain object supplied by the host.
 * The engine does not require a particular shape. Pass the row type as `TData`.
 *
 * @example
 * interface Employee {
 *   id: number;
 *   name: string;
 *   department: string;
 *   salary: number;
 * }
 */
export type RowData = object;

/** Stable identity of one row. Numeric `id` fields are stored as decimal strings. */
export type RowId = string;

/** Stable identity of one column. */
export type ColumnId = string;

/**
 * Where a column is pinned.
 * `null` means the column is not pinned.
 */
export type ColumnPinning = 'left' | 'right' | null;

/** Value accepted from callers. `"none"` is stored as `null`. */
export type ColumnPinInput = 'left' | 'right' | 'none' | null;

/** String keys of a row type. */
export type FieldName<TData extends RowData> = Extract<keyof TData, string>;

/** Direction stored on an active sort. Clearing a sort removes it from the model. */
export type SortDirection = 'asc' | 'desc';

/**
 * Default cycle for {@link GridApi.toggleSort}: ascending, descending, then unsorted.
 * A column can replace this with `sortingOrder`.
 */
export const DEFAULT_SORTING_ORDER: readonly (SortDirection | null)[] = Object.freeze([
  'asc',
  'desc',
  null,
]);

/**
 * One active column sort.
 * `sortIndex` 0 is the primary key. Later indexes break ties.
 */
export interface SortModelItem {
  readonly colId: ColumnId;
  readonly sort: SortDirection;
  readonly sortIndex: number;
}

/** Column and direction accepted by {@link GridApi.setSortModel}. Array order is the priority. */
export interface SortModelInput {
  readonly colId: ColumnId;
  readonly sort: SortDirection;
}

/**
 * Values passed to a column `comparator`.
 * Return a negative number when `valueA` comes before `valueB` in ascending order.
 * The engine reverses that result when the column is descending.
 * `nodeA.rowIndex` and `nodeB.rowIndex` are indexes in the source row order.
 */
export interface SortComparatorParams<TData extends RowData> {
  readonly valueA: unknown;
  readonly valueB: unknown;
  readonly nodeA: RowNode<TData>;
  readonly nodeB: RowNode<TData>;
  readonly columnId: ColumnId;
  readonly descending: boolean;
}

/** Ascending comparison for one column. The engine applies the sort direction. */
export type SortComparator<TData extends RowData> = (params: SortComparatorParams<TData>) => number;

/** How filters combine. Column filters use `and` unless the model says `or`. */
export type FilterJoin = 'and' | 'or';

/** Text match. Blank values fail the positive operators and pass the negative ones. */
export type TextFilterOperator =
  'contains' | 'notContains' | 'equals' | 'notEqual' | 'startsWith' | 'endsWith';

/**
 * Number match.
 * Only finite numbers can pass. Null, undefined, blank text, NaN, and non-numbers fail every operator.
 */
export type NumberFilterOperator =
  | 'equals'
  | 'notEqual'
  | 'greaterThan'
  | 'greaterThanOrEqual'
  | 'lessThan'
  | 'lessThanOrEqual'
  | 'inRange';

/**
 * Date match, compared as UTC calendar days.
 * Null, undefined, and values that are not a real date fail every operator.
 */
export type DateFilterOperator = 'equals' | 'before' | 'after' | 'inRange';

/** One selected set value. `null` also matches `undefined`. */
export type SetFilterValue = string | number | boolean | null;

/** One text condition. `filter` is matched as written, then case folding is applied. */
export interface TextFilterCondition {
  readonly type: TextFilterOperator;
  readonly filter: string;
}

/**
 * One number condition.
 * `filterTo` is the inclusive upper bound for `inRange` and null for every other operator.
 */
export interface NumberFilterCondition {
  readonly type: NumberFilterOperator;
  readonly filter: number;
  readonly filterTo: number | null;
}

/**
 * One date condition.
 * `dateFrom` and `dateTo` are `YYYY-MM-DD` UTC dates.
 * `dateTo` is the inclusive end for `inRange` and null for every other operator.
 */
export interface DateFilterCondition {
  readonly type: DateFilterOperator;
  readonly dateFrom: string;
  readonly dateTo: string | null;
}

/** Text filter for one column. Conditions combine with `operator`, which defaults to `and`. */
export interface TextColumnFilter {
  readonly filterType: 'text';
  readonly operator: FilterJoin;
  readonly conditions: readonly TextFilterCondition[];
  /** Null uses the grid `filtering.caseSensitive` option. */
  readonly caseSensitive: boolean | null;
}

/** Number filter for one column. Conditions combine with `operator`, which defaults to `and`. */
export interface NumberColumnFilter {
  readonly filterType: 'number';
  readonly operator: FilterJoin;
  readonly conditions: readonly NumberFilterCondition[];
}

/** Date filter for one column. Conditions combine with `operator`, which defaults to `and`. */
export interface DateColumnFilter {
  readonly filterType: 'date';
  readonly operator: FilterJoin;
  readonly conditions: readonly DateFilterCondition[];
}

/**
 * Set filter for one column.
 * A row passes when its value is one of `values`.
 * An empty `values` array matches no rows. Clear the filter to show rows again.
 */
export interface SetColumnFilter {
  readonly filterType: 'set';
  readonly values: readonly SetFilterValue[];
}

/**
 * Activates the column `filter` function.
 * The function is not part of this object and is not serialized.
 */
export interface CustomColumnFilter {
  readonly filterType: 'custom';
}

/** One column's active filter. */
export type ColumnFilter =
  TextColumnFilter | NumberColumnFilter | DateColumnFilter | SetColumnFilter | CustomColumnFilter;

/** One entry in {@link FilterModel}. */
export interface FilterModelItem {
  readonly colId: ColumnId;
  readonly filter: ColumnFilter;
}

/**
 * Active filters.
 * `join` combines different columns. `and` is the default.
 * `filters` is empty when nothing is filtered.
 */
export interface FilterModel {
  readonly join: FilterJoin;
  readonly filters: readonly FilterModelItem[];
}

/** Text condition accepted from callers. */
export interface TextFilterConditionInput {
  readonly type: TextFilterOperator;
  readonly filter: string;
}

/** Number condition accepted from callers. Omit `filterTo` except for `inRange`. */
export interface NumberFilterConditionInput {
  readonly type: NumberFilterOperator;
  readonly filter: number;
  readonly filterTo?: number | null;
}

/** Date condition accepted from callers. Omit `dateTo` except for `inRange`. */
export interface DateFilterConditionInput {
  readonly type: DateFilterOperator;
  readonly dateFrom: string;
  readonly dateTo?: string | null;
}

/** Text filter accepted from callers. Omitted `operator` means `and`. */
export interface TextColumnFilterInput {
  readonly filterType: 'text';
  readonly operator?: FilterJoin;
  readonly conditions: readonly TextFilterConditionInput[];
  readonly caseSensitive?: boolean | null;
}

/** Number filter accepted from callers. Omitted `operator` means `and`. */
export interface NumberColumnFilterInput {
  readonly filterType: 'number';
  readonly operator?: FilterJoin;
  readonly conditions: readonly NumberFilterConditionInput[];
}

/** Date filter accepted from callers. Omitted `operator` means `and`. */
export interface DateColumnFilterInput {
  readonly filterType: 'date';
  readonly operator?: FilterJoin;
  readonly conditions: readonly DateFilterConditionInput[];
}

/** Set filter accepted from callers. */
export interface SetColumnFilterInput {
  readonly filterType: 'set';
  readonly values: readonly SetFilterValue[];
}

/**
 * Values passed to a column `filter` function.
 * Return true when the row should stay visible.
 * `node.rowIndex` is the source index.
 */
export interface FilterPredicateParams<TData extends RowData> {
  readonly value: unknown;
  readonly node: RowNode<TData>;
  readonly columnId: ColumnId;
  readonly data: TData;
}

/** Custom filter for one column. The engine does not change the boolean it returns. */
export type ColumnFilterPredicate<TData extends RowData> = (
  params: FilterPredicateParams<TData>,
) => boolean;

/** Custom filter accepted from callers. `predicate` replaces the column function when set. */
export interface CustomColumnFilterInput<TData extends RowData> {
  readonly filterType: 'custom';
  readonly predicate?: ColumnFilterPredicate<TData>;
}

/** Filter accepted by {@link GridApi.setColumnFilter} and {@link GridApi.setFilterModel}. */
export type ColumnFilterInput<TData extends RowData> =
  | TextColumnFilterInput
  | NumberColumnFilterInput
  | DateColumnFilterInput
  | SetColumnFilterInput
  | CustomColumnFilterInput<TData>;

/** One caller-supplied filter. `colId` must name a filterable column. */
export interface FilterModelItemInput<TData extends RowData> {
  readonly colId: ColumnId;
  readonly filter: ColumnFilterInput<TData>;
}

/**
 * Caller-supplied filter model.
 * Omitted `join` keeps the current join. A new grid starts with `and`.
 */
export interface FilterModelInput<TData extends RowData> {
  readonly join?: FilterJoin;
  readonly filters: readonly FilterModelItemInput<TData>[];
}

/**
 * Column description supplied by the host.
 * `sortable` must be true before the column can be sorted.
 * `filterable` must be true before the column can be filtered.
 */
export interface ColumnDefinition<TData extends RowData> {
  /** Explicit id. Defaults to `field` when omitted. */
  readonly colId?: ColumnId;
  /** Row property this column reads. Null when the column has no field. */
  readonly field?: FieldName<TData> | null;
  /** Text shown as the column heading. Defaults to `field`, then `colId`. */
  readonly headerName?: string;
  /** When true, the column is hidden. Defaults to false. */
  readonly hide?: boolean;
  /** Preferred width in pixels. Null or omitted means unspecified. */
  readonly width?: number | null;
  /** Smallest accepted width in pixels. */
  readonly minWidth?: number | null;
  /** Largest accepted width in pixels. */
  readonly maxWidth?: number | null;
  /** Pin position. `"none"` and null both mean unpinned. */
  readonly pinned?: ColumnPinInput;
  /** When true, the column can appear in the sort model. Defaults to false. */
  readonly sortable?: boolean;
  /** When true, the column can appear in the filter model. Defaults to false. */
  readonly filterable?: boolean;
  /**
   * Predicate used when this column's filter model is `{ filterType: 'custom' }`.
   * Setting it does not activate a filter. This function is not serialized.
   */
  readonly filter?: ColumnFilterPredicate<TData>;
  /**
   * Initial direction used when this column is first added.
   * Null or omitted leaves the column unsorted. Requires `sortable`.
   */
  readonly sort?: SortDirection | null;
  /**
   * Ascending comparison for this column.
   * When omitted, the engine compares field values directly.
   * This function is not serialized.
   */
  readonly comparator?: SortComparator<TData>;
  /**
   * Cycle used by {@link GridApi.toggleSort}.
   * Defaults to {@link DEFAULT_SORTING_ORDER}.
   */
  readonly sortingOrder?: readonly (SortDirection | null)[];
  /**
   * When set, overrides the grid `sorting.caseSensitive` option for this column.
   * Omitted means the grid option is used.
   */
  readonly caseSensitive?: boolean;
}

/**
 * Column definition after validation, with defaults filled in.
 * `hide`, `width`, and `pinned` here are the definition values.
 * Runtime overrides live on {@link ColumnState}.
 */
export interface ResolvedColumnDefinition<TData extends RowData> {
  readonly colId: ColumnId;
  readonly field: FieldName<TData> | null;
  readonly headerName: string;
  readonly hide: boolean;
  readonly width: number | null;
  readonly minWidth: number | null;
  readonly maxWidth: number | null;
  readonly pinned: ColumnPinning;
  readonly sortable: boolean;
  readonly filterable: boolean;
  /** Cycle used by {@link GridApi.toggleSort}. */
  readonly sortingOrder: readonly (SortDirection | null)[];
  /** Null means the grid `sorting.caseSensitive` option applies. */
  readonly caseSensitive: boolean | null;
}

/**
 * Live column values. `hide`, `width`, and `pinned` come from column state.
 * The other fields come from the column definition.
 */
/** Resolved column plus the live comparator and filter predicate. Neither function is serialized. */
export interface GridColumn<TData extends RowData> extends ResolvedColumnDefinition<TData> {
  readonly comparator: SortComparator<TData> | null;
  readonly filter: ColumnFilterPredicate<TData> | null;
}

/**
 * Runtime width, visibility, and pin for one column.
 * Column state does not reorder columns. Definition order is the column order.
 */
export interface ColumnState {
  readonly colId: ColumnId;
  readonly hide: boolean;
  readonly width: number | null;
  readonly pinned: ColumnPinning;
}

/** Position of a row in the current row list. */
export interface RowPosition {
  readonly id: RowId;
  readonly rowIndex: number;
}

/** One stored row. The object is a snapshot; later edits produce a new node. */
export interface RowNode<TData extends RowData> extends RowPosition {
  readonly data: TData;
}

/**
 * Arguments passed to a host row-id function.
 * `rowIndex` is the row's index in the list being written.
 */
export interface GetRowIdParams<TData extends RowData> {
  readonly data: TData;
  readonly rowIndex: number;
}

/**
 * Host function that assigns a stable row id.
 * When this is set, it is the only identity source. The `id` field is not read.
 * Existing rows keep their ids when the list is reindexed. The function is called
 * again when a row is inserted or its data is replaced, and the result must keep
 * the existing id on replacement.
 */
export type GetRowId<TData extends RowData> = (params: GetRowIdParams<TData>) => string;

/** Replacement of one existing row. The id does not change. */
export interface RowUpdate<TData extends RowData> {
  readonly id: RowId;
  readonly data: TData;
}

/**
 * A batch of row edits applied together.
 * Order is remove, then update, then add. `addIndex` is the source-order index after removals.
 * A sort can place the inserted rows at different displayed indexes.
 * An invalid batch changes nothing.
 */
export interface RowDataTransaction<TData extends RowData> {
  readonly add?: readonly TData[];
  /** Index in the list after removals. Omit to append. */
  readonly addIndex?: number;
  readonly update?: readonly RowUpdate<TData>[];
  readonly remove?: readonly RowId[];
}

/** Rows affected by a transaction. Removed nodes keep their previous indexes. */
export interface RowDataTransactionResult<TData extends RowData> {
  readonly added: readonly RowNode<TData>[];
  readonly updated: readonly RowNode<TData>[];
  readonly removed: readonly RowNode<TData>[];
}

/**
 * Cell coordinates stored by the engine.
 * `rowIndex` is the index in the displayed order.
 * `rowId` keeps the focused row stable when rows are inserted or resorted.
 */
export interface CellPosition {
  readonly rowIndex: number;
  readonly rowId: RowId;
  readonly columnId: ColumnId;
}

/** Which cells {@link GridApi.refreshCells} should read. Omit a list to read every row or column. */
export interface RefreshCellsParams {
  readonly rowIds?: readonly RowId[];
  readonly columnIds?: readonly ColumnId[];
}

/** Current field value of one cell. There is no renderer in this phase. */
export interface RefreshedCell<TData extends RowData> {
  readonly rowId: RowId;
  readonly rowIndex: number;
  readonly columnId: ColumnId;
  readonly field: FieldName<TData> | null;
  readonly value: unknown;
}

/**
 * How many rows can be selected.
 * `multiple` is the default and matches grids created before selection modes existed.
 * `none` rejects any non-empty selection. `single` rejects more than one id.
 */
export type SelectionMode = 'none' | 'single' | 'multiple';

/**
 * Page window over the filtered and sorted rows.
 * `page` is zero-based. `pageSize` is the stored size, including when `enabled` is false.
 * When pagination is disabled the window is the full filtered list and `page` stays 0.
 */
export interface PaginationModel {
  readonly enabled: boolean;
  readonly page: number;
  readonly pageSize: number;
  readonly pageSizeOptions: readonly number[];
}

/**
 * Serializable configuration. Functions and host context are not included.
 * `caseSensitive` is the grid default for string sorting. A column can override it.
 * `filterCaseSensitive` is the grid default for text filters. A text filter can override it.
 * `selectionMode` is `multiple` when a snapshot omits it.
 */
export interface GridConfiguration {
  readonly formatVersion: typeof GRID_STATE_FORMAT_VERSION;
  readonly caseSensitive: boolean;
  readonly filterCaseSensitive: boolean;
  readonly selectionMode: SelectionMode;
}

/** Which parts of {@link GridState} changed. */
export type GridStateChange =
  | 'rowData'
  | 'rowIds'
  | 'displayedRowIds'
  | 'columnDefs'
  | 'columnState'
  | 'sortModel'
  | 'filterModel'
  | 'pagination'
  | 'selectedRowIds'
  | 'focusedCell'
  | 'configuration';

/**
 * Snapshot of everything the engine persists.
 * `rowData` and `rowIds` stay in source order. `displayedRowIds` is the source ids that
 * pass the filter model, in sort order. Row objects are the host's objects.
 * The arrays and the snapshot itself are frozen.
 * Column comparators and filter predicates are not part of this snapshot.
 */
export interface GridState<TData extends RowData> {
  readonly rowData: readonly TData[];
  /** Aligned with `rowData`. Included so generated ids survive serialization. */
  readonly rowIds: readonly RowId[];
  /** Source ids that pass the current filters, in displayed order. */
  readonly displayedRowIds: readonly RowId[];
  readonly columnDefs: readonly ResolvedColumnDefinition<TData>[];
  readonly columnState: readonly ColumnState[];
  readonly sortModel: readonly SortModelItem[];
  readonly filterModel: FilterModel;
  /** Zero-based page window. Older snapshots omit this and restore with pagination disabled. */
  readonly pagination: PaginationModel;
  readonly selectedRowIds: readonly RowId[];
  readonly focusedCell: CellPosition | null;
  readonly configuration: GridConfiguration;
}

/** Called after a grid state change with the next snapshot and the previous one. */
export type GridStateListener<TData extends RowData> = (
  state: GridState<TData>,
  previous: GridState<TData>,
) => void;

/** Names of events the engine emits. */
export const GRID_EVENT_TYPES = [
  'gridReady',
  'rowDataChanged',
  'columnChanged',
  'sortChanged',
  'filterChanged',
  'paginationChanged',
  'selectionChanged',
  'cellFocused',
  'stateChanged',
] as const;

export type GridEventType = (typeof GRID_EVENT_TYPES)[number];

/** Shared fields on every grid event. */
export interface GridEventBase<TData extends RowData, TContext, TType extends GridEventType> {
  readonly type: TType;
  readonly api: GridApi<TData, TContext>;
}

export type GridReadyEvent<TData extends RowData, TContext = unknown> = GridEventBase<
  TData,
  TContext,
  'gridReady'
>;

export interface RowDataChangedEvent<
  TData extends RowData,
  TContext = unknown,
> extends GridEventBase<TData, TContext, 'rowDataChanged'> {
  readonly rowData: readonly TData[];
  readonly rowIds: readonly RowId[];
}

export interface ColumnChangedEvent<
  TData extends RowData,
  TContext = unknown,
> extends GridEventBase<TData, TContext, 'columnChanged'> {
  readonly columnDefs: readonly ResolvedColumnDefinition<TData>[];
  readonly columnState: readonly ColumnState[];
}

export interface SortChangedEvent<TData extends RowData, TContext = unknown> extends GridEventBase<
  TData,
  TContext,
  'sortChanged'
> {
  readonly sortModel: readonly SortModelItem[];
  readonly displayedRowIds: readonly RowId[];
}

export interface FilterChangedEvent<
  TData extends RowData,
  TContext = unknown,
> extends GridEventBase<TData, TContext, 'filterChanged'> {
  readonly filterModel: FilterModel;
  readonly displayedRowIds: readonly RowId[];
}

export interface PaginationChangedEvent<
  TData extends RowData,
  TContext = unknown,
> extends GridEventBase<TData, TContext, 'paginationChanged'> {
  readonly pagination: PaginationModel;
  /** Pages in the current filtered set. Zero when that set is empty. */
  readonly pageCount: number;
}

export interface SelectionChangedEvent<
  TData extends RowData,
  TContext = unknown,
> extends GridEventBase<TData, TContext, 'selectionChanged'> {
  readonly selectedRowIds: readonly RowId[];
}

export interface CellFocusedEvent<TData extends RowData, TContext = unknown> extends GridEventBase<
  TData,
  TContext,
  'cellFocused'
> {
  readonly cell: CellPosition | null;
}

export interface StateChangedEvent<TData extends RowData, TContext = unknown> extends GridEventBase<
  TData,
  TContext,
  'stateChanged'
> {
  readonly state: GridState<TData>;
  readonly changes: readonly GridStateChange[];
}

export type GridEvent<TData extends RowData, TContext = unknown> =
  | GridReadyEvent<TData, TContext>
  | RowDataChangedEvent<TData, TContext>
  | ColumnChangedEvent<TData, TContext>
  | SortChangedEvent<TData, TContext>
  | FilterChangedEvent<TData, TContext>
  | PaginationChangedEvent<TData, TContext>
  | SelectionChangedEvent<TData, TContext>
  | CellFocusedEvent<TData, TContext>
  | StateChangedEvent<TData, TContext>;

/** Listener for one event name. The event payload matches that name. */
export type GridEventListener<
  TData extends RowData,
  TType extends GridEventType,
  TContext = unknown,
> = (event: Extract<GridEvent<TData, TContext>, { type: TType }>) => void;

/**
 * Host context handed back by {@link GridApi.getContext}.
 * The engine stores `context` and does not read it. It is not serialized.
 */
export interface GridContext<TData extends RowData, TContext = unknown> {
  readonly api: GridApi<TData, TContext>;
  readonly context: TContext | undefined;
}

/**
 * Options for {@link createGrid}.
 * Unknown properties are rejected so unsupported features are not silently ignored.
 */
/** Grid-wide string sort behavior. Column `caseSensitive` overrides this. */
export interface SortingOptions {
  /** When false, string compares ignore case. Defaults to true. */
  readonly caseSensitive?: boolean;
}

/**
 * Grid-wide filter behavior.
 * Text filters can override `caseSensitive`. Column filters combine with `join` until a model replaces it.
 */
export interface FilteringOptions {
  /** How column filters combine. Defaults to `and`. */
  readonly join?: FilterJoin;
  /** When false, text filters ignore case unless a filter sets its own flag. Defaults to true. */
  readonly caseSensitive?: boolean;
}

/**
 * Page window applied after filtering and sorting.
 * Indexes are zero-based. Pagination is disabled unless `enabled` is true.
 * The default page size is 100 and the default size options are 10, 25, 50, and 100.
 * When `pageSize` is omitted and 100 is not in `pageSizeOptions`, the first option is used.
 */
export interface PaginationOptions {
  /** When false, every filtered row is on page 0. Defaults to false. */
  readonly enabled?: boolean;
  /** Zero-based page. Defaults to 0. Must already be a valid page for the initial rows. */
  readonly page?: number;
  /** Stored rows per page. Must be one of `pageSizeOptions`. */
  readonly pageSize?: number;
  /** Allowed page sizes. Defaults to 10, 25, 50, and 100. */
  readonly pageSizeOptions?: readonly number[];
}

/** Row selection. Omitted options use multiple selection so existing grids keep their behavior. */
export interface SelectionOptions {
  /** Defaults to `multiple`. */
  readonly mode?: SelectionMode;
}

export interface GridOptions<TData extends RowData, TContext = unknown> {
  readonly columnDefs: readonly ColumnDefinition<TData>[];
  readonly rowData?: readonly TData[];
  readonly getRowId?: GetRowId<TData>;
  readonly context?: TContext;
  /** String comparison used when a column does not set `caseSensitive`. */
  readonly sorting?: SortingOptions;
  /** Defaults for text matching and for the filter-model join. */
  readonly filtering?: FilteringOptions;
  /** Initial page window. Disabled unless `enabled` is true. */
  readonly pagination?: PaginationOptions;
  /** How many source rows may be selected. Defaults to multiple. */
  readonly selection?: SelectionOptions;
}

/**
 * Public engine API.
 * Methods describe the in-memory grid. They do not touch the DOM.
 * `getDisplayedRowCount` is the number of rows after filtering and sorting.
 * Pagination does not change that count or {@link GridApi.getRowNodeAtIndex}.
 * Those two stay on the full filtered, sorted list. Page methods address the current page.
 * `getRowNodeAtIndex` and focus `rowIndex` use the displayed order.
 * `getRowNode` returns a displayed row. A filtered-out row is absent there and still present in source state.
 * `getGridState().rowData` stays in source order.
 */
export interface GridApi<TData extends RowData, TContext = unknown> {
  getRowCount(): number;
  getDisplayedRowCount(): number;
  getRowNode(id: RowId): RowNode<TData> | undefined;
  getRowNodeAtIndex(index: number): RowNode<TData> | undefined;
  getColumn(id: ColumnId): GridColumn<TData> | undefined;
  getColumnDefs(): readonly ResolvedColumnDefinition<TData>[];
  getColumnState(): readonly ColumnState[];
  /** Updates width, visibility, and pin for the listed columns. Other columns stay as they are. */
  setColumnState(state: readonly ColumnState[]): void;
  /**
   * Replaces column definitions.
   * Width, visibility, and pin are kept for ids that still exist when the current
   * width is still inside the new minimum and maximum.
   */
  setColumnDefs(columnDefs: readonly ColumnDefinition<TData>[]): void;
  /** Active sorts, primary key first. */
  getSortModel(): readonly SortModelItem[];
  /**
   * Replaces the sort model. Array order is the priority.
   * An equal model does not emit an event.
   */
  setSortModel(model: readonly SortModelInput[]): void;
  /**
   * Sets one column's direction.
   * Pass null to remove it. `multi` keeps the other columns; otherwise they are cleared.
   */
  sortColumn(columnId: ColumnId, sort: SortDirection | null, multi?: boolean): void;
  /**
   * Advances the column through its `sortingOrder`.
   * `multi` keeps the other columns; otherwise the model becomes this column alone.
   */
  toggleSort(columnId: ColumnId, multi?: boolean): void;
  /** Removes every sort. Filtered rows stay filtered and return to source order. */
  clearSort(): void;
  /**
   * Runs filtering and then sorting again.
   * Use this after changing values on the existing row objects.
   * Nothing is emitted when the displayed ids are already current.
   */
  applySorting(): void;
  /** Active filters. Column order in `filters` is the order they were set. */
  getFilterModel(): FilterModel;
  /**
   * Replaces the filter model.
   * An equal model does not emit an event.
   * An invalid model leaves the current model in place.
   */
  setFilterModel(model: FilterModelInput<TData>): void;
  /**
   * Sets one column filter.
   * Pass null to remove that column. Other column filters stay in place.
   */
  setColumnFilter(columnId: ColumnId, filter: ColumnFilterInput<TData> | null): void;
  /** Removes one column from the filter model. */
  clearColumnFilter(columnId: ColumnId): void;
  /** Removes every column filter and keeps the current join. */
  clearAllFilters(): void;
  /**
   * Runs filtering and then sorting again.
   * Use this after changing values on the existing row objects.
   * Nothing is emitted when the filter model and displayed ids are already current.
   */
  applyFilters(): void;
  /** Rows that pass the current filters, after sorting. Pagination does not change this count. */
  getFilteredRowCount(): number;
  /**
   * Moves to a zero-based page.
   * An out-of-range index throws and leaves the page unchanged.
   * The current page does not emit `paginationChanged`.
   */
  setPage(page: number): void;
  /** Moves one page forward. Staying on the last page does not emit. */
  nextPage(): void;
  /** Moves one page backward. Staying on page 0 does not emit. */
  previousPage(): void;
  /** Moves to page 0. Staying there does not emit. */
  firstPage(): void;
  /** Moves to the last valid page. An empty filtered set stays on page 0. */
  lastPage(): void;
  /**
   * Stores a new page size. The size must be one of the current page size options.
   * When the current page would fall off the new page list, it moves to the last valid page.
   */
  setPageSize(pageSize: number): void;
  /** Zero-based index of the current page. */
  getCurrentPage(): number;
  /** Stored page size. This stays set while pagination is disabled. */
  getPageSize(): number;
  /**
   * Pages in the filtered, sorted list.
   * Zero when that list is empty. One when pagination is disabled and any row remains.
   */
  getPageCount(): number;
  /** Rows on the current page. Equals {@link GridApi.getDisplayedRowCount} while pagination is disabled. */
  getPaginatedRowCount(): number;
  /**
   * Row at `index` on the current page.
   * `index` is zero-based within the page. This does not change {@link GridApi.getRowNodeAtIndex}.
   */
  getRowNodeAtPageIndex(index: number): RowNode<TData> | undefined;
  getSelectedRows(): readonly TData[];
  getSelectedRowIds(): readonly RowId[];
  /**
   * Replaces the selection. Every id must exist. Duplicates are rejected.
   * `none` accepts only an empty list. `single` accepts at most one id.
   */
  setSelectedRowIds(ids: readonly RowId[]): void;
  /**
   * Selects a source row by id.
   * Multiple selection appends the id. Single selection replaces the previous id.
   * An id that is already selected does not emit. An unknown id throws.
   */
  selectRow(id: RowId): void;
  /**
   * Removes one source row from the selection.
   * A row that exists and is not selected does not emit. An unknown id throws.
   */
  deselectRow(id: RowId): void;
  /** Selects the row when it is clear, or clears it when it is selected. */
  toggleRowSelection(id: RowId): void;
  /** True when the id is selected. An unknown id returns false. */
  isRowSelected(id: RowId): boolean;
  /** Clears every selected id. An empty selection does not emit. */
  clearSelection(): void;
  /**
   * Replaces the selection with every row that passes the current filters, in displayed order.
   * The current page is ignored. Rows hidden by the filter are not selected.
   * Single selection accepts this only when that set has at most one row.
   * Throws when selection is disabled.
   */
  selectAllFilteredRows(): void;
  /**
   * Replaces the selection with every source row, in source order, including rows hidden by filters.
   * Single selection accepts this only when the source has at most one row.
   * Throws when selection is disabled.
   */
  selectAllSourceRows(): void;
  setRowData(rowData: readonly TData[]): void;
  updateRowData(transaction: RowDataTransaction<TData>): RowDataTransactionResult<TData>;
  insertRows(index: number, rows: readonly TData[]): readonly RowNode<TData>[];
  removeRows(ids: readonly RowId[]): readonly RowNode<TData>[];
  replaceRow(id: RowId, data: TData): RowNode<TData>;
  getFocusedCell(): CellPosition | null;
  /**
   * Focuses the cell at `rowIndex` in `columnId`, or clears focus when `position` is null.
   * A full {@link CellPosition} is accepted. When `rowId` is present it must match that index.
   */
  setFocusedCell(
    position: (Pick<CellPosition, 'rowIndex' | 'columnId'> & { readonly rowId?: RowId }) | null,
  ): void;
  getGridState(): GridState<TData>;
  setGridState(state: GridState<TData>): void;
  updateGridState(updater: (state: GridState<TData>) => GridState<TData>): void;
  /**
   * Reads current cell values from row data.
   * This does not emit an event and does not change state. There is no view to repaint.
   */
  refreshCells(params?: RefreshCellsParams): readonly RefreshedCell<TData>[];
  /** Subscribes to state snapshots. The listener is not called until the state changes. */
  subscribe(listener: GridStateListener<TData>): () => void;
  unsubscribe(listener: GridStateListener<TData>): void;
  /**
   * Registers an event listener.
   * The same function is stored once. A `gridReady` listener added after creation
   * is called immediately.
   */
  addEventListener<TType extends GridEventType>(
    type: TType,
    listener: GridEventListener<TData, TType, TContext>,
  ): void;
  removeEventListener<TType extends GridEventType>(
    type: TType,
    listener: GridEventListener<TData, TType, TContext>,
  ): void;
  getContext(): GridContext<TData, TContext>;
  /** Drops event listeners and state subscribers. Further calls throw. */
  destroy(): void;
}
