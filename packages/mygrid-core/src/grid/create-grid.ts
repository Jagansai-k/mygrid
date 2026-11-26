import { throwCollected } from '../call-listeners';
import {
  ColumnModel,
  preserveComparators,
  sameColumnDefinition,
  sameColumnState,
  type ColumnRecord,
} from '../columns/column-model';
import { GridError } from '../errors';
import { GridEventBus, isGridEventType } from '../events/event-bus';
import { displayRows } from '../filter/filter-rows';
import {
  assertPageInRange,
  clampPagination,
  DEFAULT_PAGINATION,
  pageCount,
  pageWindow,
  paginationFromOptions,
  paginationWithPage,
  paginationWithPageSize,
  parseStoredPagination,
  samePagination,
} from '../pagination/page-model';
import {
  assertSelectionFits,
  parseSelectionMode,
  requireSourceRowId,
} from '../selection/selection';
import {
  emptyFilterModel,
  filterModelAfterColumnChange,
  filterModelWithColumn,
  parseColumnFilterInput,
  parseFilterModelInput,
  parseStoredFilterModel,
  sameFilterModel,
} from '../filter/filter-model';
import { assertKnownKeys, isRecord, isUnknownArray, readOwnValue } from '../guards';
import { RowModel, type RowPlan } from '../rows/row-model';
import {
  EMPTY_SORT_MODEL,
  parseSortModelInput,
  parseStoredSortModel,
  sameIdList,
  sameSortModel,
  sortModelAfterColumnChange,
  sortModelWithColumn,
  toggleSortModel,
} from '../sort/sort-model';
import {
  alignFocus,
  diffState,
  parseConfiguration,
  parseDisplayedRowIds,
  parseExactFocus,
  parseExactSelection,
  parseGridStateInput,
  pruneSelection,
  stateFromPlans,
} from '../state/grid-state';
import { createGridStateManager, type GridStateController } from '../state/grid-state-manager';
import type {
  CellPosition,
  ColumnDefinition,
  ColumnFilterInput,
  ColumnFilterPredicate,
  ColumnId,
  ColumnState,
  FilterModel,
  FilterModelInput,
  GetRowId,
  GridApi,
  GridColumn,
  GridContext,
  GridEventListener,
  GridEventType,
  GridOptions,
  GridState,
  GridStateChange,
  GridStateListener,
  PaginationModel,
  RefreshedCell,
  RefreshCellsParams,
  ResolvedColumnDefinition,
  RowData,
  RowDataTransaction,
  RowDataTransactionResult,
  RowId,
  RowNode,
  SelectionMode,
  SortDirection,
  SortModelInput,
  SortModelItem,
} from '../types';

interface ParsedOptions<TData extends RowData, TContext> {
  readonly columnDefs: unknown;
  readonly rowData: readonly unknown[];
  readonly getRowId: GetRowId<TData> | undefined;
  readonly context: TContext | undefined;
  readonly caseSensitive: boolean;
  readonly filterJoin: 'and' | 'or';
  readonly filterCaseSensitive: boolean;
  readonly pagination: PaginationModel;
  readonly selectionMode: SelectionMode;
}

type DisplayReason = 'sort' | 'filter' | 'rows' | 'state';

/**
 * Creates an in-memory grid.
 * The returned API is ready immediately. A `gridReady` listener registered afterwards
 * runs before `addEventListener` returns. This function does not touch the DOM.
 */
export function createGrid<TData extends RowData, TContext = unknown>(
  options: GridOptions<TData, TContext>,
): GridApi<TData, TContext> {
  return new Grid(options);
}

class Grid<TData extends RowData, TContext> implements GridApi<TData, TContext> {
  private readonly rows: RowModel<TData>;
  private readonly columns = new ColumnModel<TData>();
  private readonly events = new GridEventBus<TData, TContext>();
  private readonly manager: GridStateController<TData>;
  private readonly contextValue: TContext | undefined;
  private displayed: readonly RowNode<TData>[] = [];
  private displayedById = new Map<RowId, RowNode<TData>>();
  private caseSensitive = true;
  private filterCaseSensitive = true;
  private ready = false;
  private destroyed = false;
  private notifying = false;

  constructor(options: GridOptions<TData, TContext>) {
    const parsed = parseOptions<TData, TContext>(options);
    this.contextValue = parsed.context;
    this.caseSensitive = parsed.caseSensitive;
    this.filterCaseSensitive = parsed.filterCaseSensitive;
    this.rows = new RowModel(parsed.getRowId);
    const rowPlan = this.rows.planSetData(parsed.rowData);
    const records = this.columns.planColumnDefs(parsed.columnDefs);
    const sortModel = sortModelAfterColumnChange(EMPTY_SORT_MODEL, [], records);
    const filterModel = emptyFilterModel(parsed.filterJoin);
    const displayed = displayRows(
      rowPlan.nodes,
      filterModel,
      sortModel,
      records,
      parsed.caseSensitive,
      parsed.filterCaseSensitive,
    );
    assertPageInRange(parsed.pagination.page, displayed.length, parsed.pagination);
    this.rows.commit(rowPlan);
    this.columns.commit(records);
    this.replaceDisplayed(displayed);
    this.manager = createGridStateManager(
      stateFromPlans(
        rowPlan,
        displayed,
        records,
        [],
        null,
        sortModel,
        filterModel,
        parsed.caseSensitive,
        parsed.filterCaseSensitive,
        parsed.pagination,
        parsed.selectionMode,
      ),
      acceptState,
    );
    this.ready = true;
    throwCollected(this.events.emit({ type: 'gridReady', api: this }));
  }

  getRowCount(): number {
    this.assertActive();
    return this.rows.getNodes().length;
  }

  getDisplayedRowCount(): number {
    this.assertActive();
    return this.displayed.length;
  }

  getFilteredRowCount(): number {
    this.assertActive();
    return this.displayed.length;
  }

  setPage(page: number): void {
    this.assertActive();
    const state = this.manager.getState();
    this.writePagination(paginationWithPage(state.pagination, page, this.displayed.length));
  }

  nextPage(): void {
    this.assertActive();
    const state = this.manager.getState();
    const count = pageCount(this.displayed.length, state.pagination);
    if (!state.pagination.enabled || count <= 1 || state.pagination.page >= count - 1) {
      return;
    }
    this.writePagination(
      paginationWithPage(state.pagination, state.pagination.page + 1, this.displayed.length),
    );
  }

  previousPage(): void {
    this.assertActive();
    const pagination = this.manager.getState().pagination;
    if (!pagination.enabled || pagination.page === 0) {
      return;
    }
    this.writePagination(
      paginationWithPage(pagination, pagination.page - 1, this.displayed.length),
    );
  }

  firstPage(): void {
    this.assertActive();
    const pagination = this.manager.getState().pagination;
    this.writePagination(paginationWithPage(pagination, 0, this.displayed.length));
  }

  lastPage(): void {
    this.assertActive();
    const pagination = this.manager.getState().pagination;
    const count = pageCount(this.displayed.length, pagination);
    const last = count === 0 ? 0 : count - 1;
    this.writePagination(paginationWithPage(pagination, last, this.displayed.length));
  }

  setPageSize(pageSize: number): void {
    this.assertActive();
    const state = this.manager.getState();
    this.writePagination(paginationWithPageSize(state.pagination, pageSize, this.displayed.length));
  }

  getCurrentPage(): number {
    this.assertActive();
    return this.manager.getState().pagination.page;
  }

  getPageSize(): number {
    this.assertActive();
    return this.manager.getState().pagination.pageSize;
  }

  getPageCount(): number {
    this.assertActive();
    return pageCount(this.displayed.length, this.manager.getState().pagination);
  }

  getPaginatedRowCount(): number {
    this.assertActive();
    return pageWindow(this.displayed.length, this.manager.getState().pagination).count;
  }

  getRowNodeAtPageIndex(index: number): RowNode<TData> | undefined {
    this.assertActive();
    if (!Number.isInteger(index) || index < 0) {
      return undefined;
    }
    const slice = pageWindow(this.displayed.length, this.manager.getState().pagination);
    if (index >= slice.count) {
      return undefined;
    }
    return this.displayed[slice.start + index];
  }

  getRowNode(id: RowId): RowNode<TData> | undefined {
    this.assertActive();
    return this.displayedById.get(id);
  }

  getRowNodeAtIndex(index: number): RowNode<TData> | undefined {
    this.assertActive();
    if (!Number.isInteger(index) || index < 0) {
      return undefined;
    }
    return this.displayed[index];
  }

  getColumn(id: ColumnId): GridColumn<TData> | undefined {
    this.assertActive();
    return this.columns.getColumn(id);
  }

  getColumnDefs(): readonly ResolvedColumnDefinition<TData>[] {
    this.assertActive();
    return this.columns.getDefinitions();
  }

  getColumnState(): readonly ColumnState[] {
    this.assertActive();
    return this.columns.getState();
  }

  setColumnState(state: readonly ColumnState[]): void {
    this.assertActive();
    const records = this.columns.planColumnState(state);
    this.publishColumns(records);
  }

  setColumnDefs(columnDefs: readonly ColumnDefinition<TData>[]): void {
    this.assertActive();
    const records = this.columns.planColumnDefs(columnDefs);
    this.publishColumns(records);
  }

  getSortModel(): readonly SortModelItem[] {
    this.assertActive();
    return this.manager.getState().sortModel;
  }

  setSortModel(model: readonly SortModelInput[]): void {
    this.assertActive();
    const sortModel = parseSortModelInput(model, this.columns.getRecords());
    if (sameSortModel(sortModel, this.manager.getState().sortModel)) {
      return;
    }
    this.present(
      this.rows.snapshotPlan(),
      this.columns.getRecords(),
      sortModel,
      this.manager.getState().filterModel,
      'sort',
    );
  }

  sortColumn(columnId: ColumnId, sort: SortDirection | null, multi?: boolean): void {
    this.assertActive();
    const record = this.requireSortable(columnId);
    const direction: unknown = sort;
    if (direction !== null && direction !== 'asc' && direction !== 'desc') {
      throw new GridError('invalid-column', 'Sort direction must be "asc", "desc", or null.');
    }
    const sortModel = sortModelWithColumn(
      this.manager.getState().sortModel,
      record.definition.colId,
      sort,
      readMulti(multi),
    );
    if (sameSortModel(sortModel, this.manager.getState().sortModel)) {
      return;
    }
    this.present(
      this.rows.snapshotPlan(),
      this.columns.getRecords(),
      sortModel,
      this.manager.getState().filterModel,
      'sort',
    );
  }

  toggleSort(columnId: ColumnId, multi?: boolean): void {
    this.assertActive();
    const record = this.requireSortable(columnId);
    const sortModel = toggleSortModel(this.manager.getState().sortModel, record, readMulti(multi));
    if (sameSortModel(sortModel, this.manager.getState().sortModel)) {
      return;
    }
    this.present(
      this.rows.snapshotPlan(),
      this.columns.getRecords(),
      sortModel,
      this.manager.getState().filterModel,
      'sort',
    );
  }

  clearSort(): void {
    this.setSortModel([]);
  }

  applySorting(): void {
    this.assertActive();
    const state = this.manager.getState();
    this.present(
      this.rows.snapshotPlan(),
      this.columns.getRecords(),
      state.sortModel,
      state.filterModel,
      'sort',
    );
  }

  getFilterModel(): FilterModel {
    this.assertActive();
    return this.manager.getState().filterModel;
  }

  setFilterModel(model: FilterModelInput<TData>): void {
    this.assertActive();
    const current = this.manager.getState().filterModel;
    const parsed = parseFilterModelInput(model, this.columns.getRecords(), current.join);
    const records = this.replacePredicates(this.columns.getRecords(), parsed.predicates);
    if (sameFilterModel(parsed.model, current) && records === this.columns.getRecords()) {
      return;
    }
    this.present(
      this.rows.snapshotPlan(),
      records,
      this.manager.getState().sortModel,
      parsed.model,
      'filter',
    );
  }

  setColumnFilter(columnId: ColumnId, filter: ColumnFilterInput<TData> | null): void {
    this.assertActive();
    const record = this.requireFilterable(columnId);
    const parsed = parseColumnFilterInput<TData>(filter);
    const current = this.manager.getState().filterModel;
    const nextModel = filterModelWithColumn(current, record.definition.colId, parsed.filter);
    const predicates = new Map<ColumnId, ColumnFilterPredicate<TData>>();
    if (parsed.predicate !== undefined) {
      predicates.set(record.definition.colId, parsed.predicate);
    }
    const records = this.replacePredicates(this.columns.getRecords(), predicates);
    if (sameFilterModel(nextModel, current) && records === this.columns.getRecords()) {
      return;
    }
    this.present(
      this.rows.snapshotPlan(),
      records,
      this.manager.getState().sortModel,
      nextModel,
      'filter',
    );
  }

  clearColumnFilter(columnId: ColumnId): void {
    this.setColumnFilter(columnId, null);
  }

  clearAllFilters(): void {
    this.assertActive();
    const current = this.manager.getState().filterModel;
    const next = emptyFilterModel(current.join);
    if (sameFilterModel(next, current)) {
      return;
    }
    this.present(
      this.rows.snapshotPlan(),
      this.columns.getRecords(),
      this.manager.getState().sortModel,
      next,
      'filter',
    );
  }

  applyFilters(): void {
    this.assertActive();
    const state = this.manager.getState();
    this.present(
      this.rows.snapshotPlan(),
      this.columns.getRecords(),
      state.sortModel,
      state.filterModel,
      'filter',
    );
  }

  getSelectedRows(): readonly TData[] {
    this.assertActive();
    const byId = new Map(this.rows.getNodes().map((node) => [node.id, node]));
    const rows: TData[] = [];
    for (const id of this.manager.getState().selectedRowIds) {
      const node = byId.get(id);
      if (node === undefined) {
        throw new GridError('invalid-state', `Selected row "${id}" is missing.`);
      }
      rows.push(node.data);
    }
    return Object.freeze(rows);
  }

  getSelectedRowIds(): readonly RowId[] {
    this.assertActive();
    return this.manager.getState().selectedRowIds;
  }

  setSelectedRowIds(ids: readonly RowId[]): void {
    this.assertActive();
    const state = this.manager.getState();
    const selectedRowIds = parseExactSelection(ids, this.rows.getNodes());
    assertSelectionFits(selectedRowIds, state.configuration.selectionMode);
    this.writeSelection(selectedRowIds);
  }

  selectRow(id: RowId): void {
    this.assertActive();
    const state = this.manager.getState();
    if (state.configuration.selectionMode === 'none') {
      throw new GridError('invalid-selection', 'Selection is disabled.');
    }
    const rowId = requireSourceRowId(id, this.rows.getNodes());
    if (state.configuration.selectionMode === 'single') {
      this.writeSelection([rowId]);
      return;
    }
    if (state.selectedRowIds.includes(rowId)) {
      return;
    }
    this.writeSelection([...state.selectedRowIds, rowId]);
  }

  deselectRow(id: RowId): void {
    this.assertActive();
    const rowId = requireSourceRowId(id, this.rows.getNodes());
    const selectedRowIds = this.manager.getState().selectedRowIds;
    if (!selectedRowIds.includes(rowId)) {
      return;
    }
    this.writeSelection(selectedRowIds.filter((selected) => selected !== rowId));
  }

  toggleRowSelection(id: RowId): void {
    this.assertActive();
    const rowId = requireSourceRowId(id, this.rows.getNodes());
    if (this.manager.getState().selectedRowIds.includes(rowId)) {
      this.deselectRow(rowId);
      return;
    }
    this.selectRow(rowId);
  }

  isRowSelected(id: RowId): boolean {
    this.assertActive();
    return typeof id === 'string' && this.manager.getState().selectedRowIds.includes(id);
  }

  clearSelection(): void {
    this.assertActive();
    this.writeSelection([]);
  }

  selectAllFilteredRows(): void {
    this.assertActive();
    this.replaceSelection(this.displayed.map((node) => node.id));
  }

  selectAllSourceRows(): void {
    this.assertActive();
    this.replaceSelection(this.rows.getNodes().map((node) => node.id));
  }

  setRowData(rowData: readonly TData[]): void {
    this.assertActive();
    this.publishRows(this.rows.planSetData(rowData));
  }

  updateRowData(transaction: RowDataTransaction<TData>): RowDataTransactionResult<TData> {
    this.assertActive();
    return this.applyTransaction(transaction);
  }

  insertRows(index: number, rows: readonly TData[]): readonly RowNode<TData>[] {
    this.assertActive();
    if (typeof index !== 'number' || !Number.isInteger(index)) {
      throw new GridError('invalid-row', 'Insert index must be an integer.');
    }
    return this.applyTransaction({ add: rows, addIndex: index }).added;
  }

  removeRows(ids: readonly RowId[]): readonly RowNode<TData>[] {
    this.assertActive();
    return this.applyTransaction({ remove: ids }).removed;
  }

  replaceRow(id: RowId, data: TData): RowNode<TData> {
    this.assertActive();
    const updated = this.applyTransaction({ update: [{ id, data }] }).updated;
    const node = updated[0];
    if (node === undefined) {
      throw new GridError('invalid-row', `Cannot replace missing row "${id}".`);
    }
    return node;
  }

  getFocusedCell(): CellPosition | null {
    this.assertActive();
    return this.manager.getState().focusedCell;
  }

  setFocusedCell(
    position: (Pick<CellPosition, 'rowIndex' | 'columnId'> & { readonly rowId?: RowId }) | null,
  ): void {
    this.assertActive();
    const focusedCell =
      position === null ? null : readFocusAddress(position, this.displayed, this.columns);
    const records = this.columns.getRecords();
    const state = this.manager.getState();
    this.publish({
      rowPlan: this.rows.snapshotPlan(),
      displayed: this.displayed,
      records,
      selectedRowIds: state.selectedRowIds,
      focusedCell,
      sortModel: state.sortModel,
      filterModel: state.filterModel,
      caseSensitive: this.caseSensitive,
      filterCaseSensitive: this.filterCaseSensitive,
      pagination: state.pagination,
      selectionMode: state.configuration.selectionMode,
      reason: 'state',
    });
  }

  getGridState(): GridState<TData> {
    this.assertActive();
    return this.manager.getState();
  }

  setGridState(state: GridState<TData>): void {
    this.assertActive();
    this.applyState(state);
  }

  updateGridState(updater: (state: GridState<TData>) => GridState<TData>): void {
    this.assertActive();
    if (typeof updater !== 'function') {
      throw new GridError('invalid-state', 'State updater must be a function.');
    }
    this.applyState(updater(this.manager.getState()));
  }

  refreshCells(params?: RefreshCellsParams): readonly RefreshedCell<TData>[] {
    this.assertActive();
    const targets = readRefreshTargets(params, this.displayed, this.columns);
    const cells: RefreshedCell<TData>[] = [];
    for (const rowId of targets.rowIds) {
      const node = this.displayedById.get(rowId);
      if (node === undefined) {
        throw new GridError('invalid-row', `Unknown row "${rowId}".`);
      }
      for (const columnId of targets.columnIds) {
        const column = this.columns.getColumn(columnId);
        if (column === undefined) {
          throw new GridError('invalid-column', `Unknown column "${columnId}".`);
        }
        cells.push(
          Object.freeze({
            rowId: node.id,
            rowIndex: node.rowIndex,
            columnId: column.colId,
            field: column.field,
            value: column.field === null ? null : readOwnValue(node.data, column.field),
          }),
        );
      }
    }
    return Object.freeze(cells);
  }

  subscribe(listener: GridStateListener<TData>): () => void {
    this.assertActive();
    if (typeof listener !== 'function') {
      throw new GridError('invalid-state', 'State listener must be a function.');
    }
    return this.manager.subscribe(listener);
  }

  unsubscribe(listener: GridStateListener<TData>): void {
    this.assertActive();
    this.manager.unsubscribe(listener);
  }

  addEventListener<TType extends GridEventType>(
    type: TType,
    listener: GridEventListener<TData, TType, TContext>,
  ): void {
    this.assertActive();
    if (!isGridEventType(type)) {
      throw new GridError('invalid-event', `Unknown grid event "${String(type)}".`);
    }
    if (typeof listener !== 'function') {
      throw new GridError('invalid-event', 'Event listener must be a function.');
    }
    const added = this.events.add(type, listener);
    if (added && type === 'gridReady' && this.ready) {
      try {
        const readyListener = listener as unknown as GridEventListener<
          TData,
          'gridReady',
          TContext
        >;
        readyListener(Object.freeze({ type: 'gridReady', api: this }));
      } catch (error: unknown) {
        this.events.remove(type, listener);
        throw error;
      }
    }
  }

  removeEventListener<TType extends GridEventType>(
    type: TType,
    listener: GridEventListener<TData, TType, TContext>,
  ): void {
    this.assertActive();
    if (!isGridEventType(type)) {
      throw new GridError('invalid-event', `Unknown grid event "${String(type)}".`);
    }
    this.events.remove(type, listener);
  }

  getContext(): GridContext<TData, TContext> {
    this.assertActive();
    return { api: this, context: this.contextValue };
  }

  destroy(): void {
    if (this.destroyed) {
      return;
    }
    this.destroyed = true;
    this.events.clear();
    this.manager.clear();
  }

  private publishColumns(records: readonly ColumnRecord<TData>[]): void {
    const state = this.manager.getState();
    const sortModel = sortModelAfterColumnChange(
      state.sortModel,
      this.columns.getRecords(),
      records,
    );
    const filterModel = filterModelAfterColumnChange(state.filterModel, records);
    this.present(this.rows.snapshotPlan(), records, sortModel, filterModel, 'state');
  }

  private publishRows(rowPlan: RowPlan<TData>): void {
    const state = this.manager.getState();
    this.present(rowPlan, this.columns.getRecords(), state.sortModel, state.filterModel, 'rows');
  }

  private present(
    rowPlan: RowPlan<TData>,
    records: readonly ColumnRecord<TData>[],
    sortModel: readonly SortModelItem[],
    filterModel: FilterModel,
    reason: DisplayReason,
  ): void {
    const displayed = displayRows(
      rowPlan.nodes,
      filterModel,
      sortModel,
      records,
      this.caseSensitive,
      this.filterCaseSensitive,
      this.displayed,
    );
    const state = this.manager.getState();
    this.publish({
      rowPlan,
      displayed,
      records,
      selectedRowIds: pruneSelection(state.selectedRowIds, rowPlan.nodes),
      focusedCell: alignFocus(state.focusedCell, displayed, records),
      sortModel,
      filterModel,
      caseSensitive: this.caseSensitive,
      filterCaseSensitive: this.filterCaseSensitive,
      pagination: clampPagination(state.pagination, displayed.length),
      selectionMode: state.configuration.selectionMode,
      reason,
    });
  }

  private applyTransaction(
    transaction: RowDataTransaction<TData>,
  ): RowDataTransactionResult<TData> {
    const planned = this.rows.planTransaction(transaction);
    this.publishRows(planned.plan);
    return {
      added: planned.result.added.map((node) => this.displayedById.get(node.id) ?? node),
      updated: planned.result.updated.map((node) => this.displayedById.get(node.id) ?? node),
      removed: planned.result.removed,
    };
  }

  private applyState(input: unknown): void {
    const parsed = parseGridStateInput(input);
    const configuration = parseConfiguration(parsed.configuration);
    const rowPlan = this.rows.planExplicit(parsed.rowData, parsed.rowIds);
    const records = preserveComparators(
      this.columns.getRecords(),
      this.columns.planColumnModel(parsed.columnDefs, parsed.columnState),
    );
    const sortModel = parseStoredSortModel(parsed.sortModel, records);
    const filterModel = parseStoredFilterModel(parsed.filterModel, records);
    const displayedIds = parseDisplayedRowIds(
      parsed.displayedRowIds,
      rowPlan.nodes.map((node) => node.id),
    );
    const displayed = displayRows(
      rowPlan.nodes,
      filterModel,
      sortModel,
      records,
      configuration.caseSensitive,
      configuration.filterCaseSensitive,
      this.displayed,
    );
    if (
      !sameIdList(
        displayed.map((node) => node.id),
        displayedIds,
      )
    ) {
      throw new GridError(
        'invalid-state',
        'Displayed row order does not match the filter model, sort model, and column comparators.',
      );
    }
    const selectedRowIds = parseExactSelection(parsed.selectedRowIds, rowPlan.nodes);
    assertSelectionFits(selectedRowIds, configuration.selectionMode);
    const pagination = parseStoredPagination(parsed.pagination);
    assertPageInRange(pagination.page, displayed.length, pagination);
    this.publish({
      rowPlan,
      displayed,
      records,
      selectedRowIds,
      focusedCell: parseExactFocus(parsed.focusedCell, displayed, records),
      sortModel,
      filterModel,
      caseSensitive: configuration.caseSensitive,
      filterCaseSensitive: configuration.filterCaseSensitive,
      pagination,
      selectionMode: configuration.selectionMode,
      reason: 'state',
    });
  }

  private publish(input: {
    readonly rowPlan: RowPlan<TData>;
    readonly displayed: readonly RowNode<TData>[];
    readonly records: readonly ColumnRecord<TData>[];
    readonly selectedRowIds: readonly RowId[];
    readonly focusedCell: CellPosition | null;
    readonly sortModel: readonly SortModelItem[];
    readonly filterModel: FilterModel;
    readonly caseSensitive: boolean;
    readonly filterCaseSensitive: boolean;
    readonly pagination: PaginationModel;
    readonly selectionMode: SelectionMode;
    readonly reason: DisplayReason;
  }): void {
    if (this.notifying) {
      throw new GridError(
        'invalid-state',
        'Grid state cannot change while an event listener or state subscriber is running.',
      );
    }
    const next = stateFromPlans(
      input.rowPlan,
      input.displayed,
      input.records,
      input.selectedRowIds,
      input.focusedCell,
      input.sortModel,
      input.filterModel,
      input.caseSensitive,
      input.filterCaseSensitive,
      input.pagination,
      input.selectionMode,
    );
    const previous = this.manager.getState();
    const changes = diffState(previous, next);
    const recordsChanged = !sameRuntimeRecords(this.columns.getRecords(), input.records);
    if (changes.length === 0 && !recordsChanged) {
      return;
    }
    this.rows.commit(input.rowPlan);
    this.columns.commit(input.records);
    this.caseSensitive = input.caseSensitive;
    this.filterCaseSensitive = input.filterCaseSensitive;
    this.replaceDisplayed(input.displayed);
    if (changes.length === 0) {
      return;
    }
    this.manager.replace(next);
    this.notifying = true;
    try {
      throwCollected([
        ...this.emitChanges(previous, next, changes, input.reason),
        ...this.manager.notify(previous),
      ]);
    } finally {
      this.notifying = false;
    }
  }

  private emitChanges(
    previous: GridState<TData>,
    next: GridState<TData>,
    changes: readonly GridStateChange[],
    reason: DisplayReason,
  ): unknown[] {
    const changed = new Set<GridStateChange>(changes);
    const displayShift = changed.has('displayedRowIds') && !changed.has('rowIds');
    const filterCaseChanged =
      previous.configuration.filterCaseSensitive !== next.configuration.filterCaseSensitive;
    const errors: unknown[] = [];
    if (changed.has('rowData') || changed.has('rowIds')) {
      errors.push(
        ...this.events.emit({
          type: 'rowDataChanged',
          api: this,
          rowData: next.rowData,
          rowIds: next.rowIds,
        }),
      );
    }
    if (changed.has('columnDefs') || changed.has('columnState')) {
      errors.push(
        ...this.events.emit({
          type: 'columnChanged',
          api: this,
          columnDefs: next.columnDefs,
          columnState: next.columnState,
        }),
      );
    }
    if (
      changed.has('sortModel') ||
      (displayShift && !changed.has('filterModel') && !filterCaseChanged && reason !== 'filter')
    ) {
      errors.push(
        ...this.events.emit({
          type: 'sortChanged',
          api: this,
          sortModel: next.sortModel,
          displayedRowIds: next.displayedRowIds,
        }),
      );
    }
    if (
      changed.has('filterModel') ||
      (displayShift && (reason === 'filter' || filterCaseChanged))
    ) {
      errors.push(
        ...this.events.emit({
          type: 'filterChanged',
          api: this,
          filterModel: next.filterModel,
          displayedRowIds: next.displayedRowIds,
        }),
      );
    }
    if (changed.has('pagination')) {
      errors.push(
        ...this.events.emit({
          type: 'paginationChanged',
          api: this,
          pagination: next.pagination,
          pageCount: pageCount(next.displayedRowIds.length, next.pagination),
        }),
      );
    }
    if (changed.has('selectedRowIds')) {
      errors.push(
        ...this.events.emit({
          type: 'selectionChanged',
          api: this,
          selectedRowIds: next.selectedRowIds,
        }),
      );
    }
    if (changed.has('focusedCell')) {
      errors.push(
        ...this.events.emit({
          type: 'cellFocused',
          api: this,
          cell: next.focusedCell,
        }),
      );
    }
    errors.push(
      ...this.events.emit({
        type: 'stateChanged',
        api: this,
        state: next,
        changes: Object.freeze([...changes]),
      }),
    );
    return errors;
  }

  private writePagination(pagination: PaginationModel): void {
    const state = this.manager.getState();
    if (samePagination(pagination, state.pagination)) {
      return;
    }
    this.publish({
      rowPlan: this.rows.snapshotPlan(),
      displayed: this.displayed,
      records: this.columns.getRecords(),
      selectedRowIds: state.selectedRowIds,
      focusedCell: state.focusedCell,
      sortModel: state.sortModel,
      filterModel: state.filterModel,
      caseSensitive: this.caseSensitive,
      filterCaseSensitive: this.filterCaseSensitive,
      pagination,
      selectionMode: state.configuration.selectionMode,
      reason: 'state',
    });
  }

  private writeSelection(selectedRowIds: readonly RowId[]): void {
    const state = this.manager.getState();
    if (sameIdList(selectedRowIds, state.selectedRowIds)) {
      return;
    }
    this.publish({
      rowPlan: this.rows.snapshotPlan(),
      displayed: this.displayed,
      records: this.columns.getRecords(),
      selectedRowIds,
      focusedCell: state.focusedCell,
      sortModel: state.sortModel,
      filterModel: state.filterModel,
      caseSensitive: this.caseSensitive,
      filterCaseSensitive: this.filterCaseSensitive,
      pagination: state.pagination,
      selectionMode: state.configuration.selectionMode,
      reason: 'state',
    });
  }

  private replaceSelection(selectedRowIds: readonly RowId[]): void {
    const mode = this.manager.getState().configuration.selectionMode;
    if (mode === 'none') {
      throw new GridError('invalid-selection', 'Selection is disabled.');
    }
    assertSelectionFits(selectedRowIds, mode);
    this.writeSelection(selectedRowIds);
  }

  private assertActive(): void {
    if (this.destroyed) {
      throw new GridError('destroyed', 'This grid has been destroyed.');
    }
  }

  private replaceDisplayed(displayed: readonly RowNode<TData>[]): void {
    this.displayed = displayed;
    this.displayedById = new Map(displayed.map((node) => [node.id, node]));
  }

  private requireSortable(columnId: ColumnId): ColumnRecord<TData> {
    if (typeof columnId !== 'string' || columnId.trim().length === 0) {
      throw new GridError('invalid-column', 'Sort column id must be a non-empty string.');
    }
    const record = this.columns.getRecords().find((item) => item.definition.colId === columnId);
    if (record === undefined) {
      throw new GridError('invalid-column', `Unknown sort column "${columnId}".`);
    }
    if (!record.definition.sortable) {
      throw new GridError('invalid-column', `Column "${columnId}" is not sortable.`);
    }
    return record;
  }

  private requireFilterable(columnId: ColumnId): ColumnRecord<TData> {
    if (typeof columnId !== 'string' || columnId.trim().length === 0) {
      throw new GridError('invalid-column', 'Filter column id must be a non-empty string.');
    }
    const record = this.columns.getRecords().find((item) => item.definition.colId === columnId);
    if (record === undefined) {
      throw new GridError('invalid-column', `Unknown filter column "${columnId}".`);
    }
    if (!record.definition.filterable) {
      throw new GridError('invalid-column', `Column "${columnId}" is not filterable.`);
    }
    return record;
  }

  private replacePredicates(
    records: readonly ColumnRecord<TData>[],
    predicates: ReadonlyMap<ColumnId, ColumnFilterPredicate<TData>>,
  ): readonly ColumnRecord<TData>[] {
    if (predicates.size === 0) {
      return records;
    }
    const next = records.map((record) => {
      const predicate = predicates.get(record.definition.colId);
      if (predicate === undefined || predicate === record.filterPredicate) {
        return record;
      }
      return Object.freeze({ ...record, filterPredicate: predicate });
    });
    const unchanged = next.every((record, index) => record === records[index]);
    return unchanged ? records : Object.freeze(next);
  }
}

function acceptState(): void {
  return;
}

function parseOptions<TData extends RowData, TContext>(
  options: GridOptions<TData, TContext>,
): ParsedOptions<TData, TContext> {
  if (!isRecord(options)) {
    throw new GridError('invalid-state', 'Grid options must be an object.');
  }
  assertKnownKeys(
    options,
    [
      'columnDefs',
      'rowData',
      'getRowId',
      'context',
      'sorting',
      'filtering',
      'pagination',
      'selection',
    ],
    'Grid options',
    'invalid-state',
  );
  if (!Object.hasOwn(options, 'columnDefs')) {
    throw new GridError('invalid-state', 'Grid options are missing columnDefs.');
  }
  let rowData: readonly unknown[] = [];
  if (Object.hasOwn(options, 'rowData')) {
    if (!Array.isArray(options.rowData)) {
      throw new GridError('invalid-row', 'Row data must be an array.');
    }
    rowData = options.rowData;
  }
  let getRowId: GetRowId<TData> | undefined;
  if (Object.hasOwn(options, 'getRowId')) {
    if (typeof options.getRowId !== 'function') {
      throw new GridError('invalid-row', 'getRowId must be a function.');
    }
    getRowId = options.getRowId;
  }
  const context = Object.hasOwn(options, 'context') ? (options.context as TContext) : undefined;
  const caseSensitive = Object.hasOwn(options, 'sorting')
    ? readSortingOption(options.sorting)
    : true;
  const filtering = Object.hasOwn(options, 'filtering')
    ? readFilteringOption(options.filtering)
    : { join: 'and' as const, caseSensitive: true };
  const pagination = Object.hasOwn(options, 'pagination')
    ? paginationFromOptions(options.pagination)
    : DEFAULT_PAGINATION;
  const selectionMode = Object.hasOwn(options, 'selection')
    ? readSelectionOption(options.selection)
    : 'multiple';
  return {
    columnDefs: options.columnDefs,
    rowData,
    getRowId,
    context,
    caseSensitive,
    filterJoin: filtering.join,
    filterCaseSensitive: filtering.caseSensitive,
    pagination,
    selectionMode,
  };
}

function readSortingOption(value: unknown): boolean {
  if (!isRecord(value)) {
    throw new GridError('invalid-state', 'Sorting options must be an object.');
  }
  assertKnownKeys(value, ['caseSensitive'], 'Sorting options', 'invalid-state');
  if (!Object.hasOwn(value, 'caseSensitive')) {
    return true;
  }
  if (typeof value.caseSensitive !== 'boolean') {
    throw new GridError('invalid-state', 'Sorting caseSensitive must be a boolean.');
  }
  return value.caseSensitive;
}

function readFilteringOption(value: unknown): {
  readonly join: 'and' | 'or';
  readonly caseSensitive: boolean;
} {
  if (!isRecord(value)) {
    throw new GridError('invalid-state', 'Filtering options must be an object.');
  }
  assertKnownKeys(value, ['join', 'caseSensitive'], 'Filtering options', 'invalid-state');
  const join = Object.hasOwn(value, 'join') ? value.join : 'and';
  if (join !== 'and' && join !== 'or') {
    throw new GridError('invalid-state', 'Filtering join must be "and" or "or".');
  }
  if (!Object.hasOwn(value, 'caseSensitive')) {
    return { join, caseSensitive: true };
  }
  if (typeof value.caseSensitive !== 'boolean') {
    throw new GridError('invalid-state', 'Filtering caseSensitive must be a boolean.');
  }
  return { join, caseSensitive: value.caseSensitive };
}

function readSelectionOption(value: unknown): SelectionMode {
  if (!isRecord(value)) {
    throw new GridError('invalid-state', 'Selection options must be an object.');
  }
  assertKnownKeys(value, ['mode'], 'Selection options', 'invalid-state');
  if (!Object.hasOwn(value, 'mode')) {
    return 'multiple';
  }
  return parseSelectionMode(value.mode);
}

function readMulti(value: boolean | undefined): boolean {
  if (value === undefined) {
    return false;
  }
  if (typeof value !== 'boolean') {
    throw new GridError('invalid-column', 'Sort multi flag must be a boolean.');
  }
  return value;
}

function readFocusAddress<TData extends RowData>(
  position: Pick<CellPosition, 'rowIndex' | 'columnId'> & { readonly rowId?: RowId },
  displayed: readonly RowNode<TData>[],
  columns: ColumnModel<TData>,
): CellPosition {
  const value: unknown = position;
  if (!isRecord(value)) {
    throw new GridError('invalid-focus', 'Focused cell must be an object or null.');
  }
  assertKnownKeys(value, ['rowIndex', 'columnId', 'rowId'], 'Focused cell', 'invalid-focus');
  const rowIndex = value.rowIndex;
  const columnId = value.columnId;
  if (typeof rowIndex !== 'number' || !Number.isInteger(rowIndex) || rowIndex < 0) {
    throw new GridError(
      'invalid-focus',
      'Focused cell rowIndex must be an integer of 0 or greater.',
    );
  }
  if (typeof columnId !== 'string' || columnId.trim().length === 0) {
    throw new GridError('invalid-focus', 'Focused cell columnId must be a non-empty string.');
  }
  const node = displayed[rowIndex];
  if (node === undefined) {
    throw new GridError('invalid-focus', `Focused row index ${rowIndex} is out of range.`);
  }
  if (!columns.getRecords().some((record) => record.definition.colId === columnId)) {
    throw new GridError('invalid-focus', `Focused column "${columnId}" does not exist.`);
  }
  if (Object.hasOwn(value, 'rowId') && value.rowId !== node.id) {
    throw new GridError('invalid-focus', 'Focused cell rowIndex does not match rowId.');
  }
  return Object.freeze({ rowIndex, rowId: node.id, columnId });
}

function readRefreshTargets<TData extends RowData>(
  params: RefreshCellsParams | undefined,
  displayed: readonly RowNode<TData>[],
  columns: ColumnModel<TData>,
): { readonly rowIds: readonly RowId[]; readonly columnIds: readonly ColumnId[] } {
  const allRowIds = displayed.map((node) => node.id);
  const knownRows = new Set(allRowIds);
  const allColumnIds = columns.getRecords().map((record) => record.definition.colId);
  if (params === undefined) {
    return { rowIds: allRowIds, columnIds: allColumnIds };
  }
  if (!isRecord(params)) {
    throw new GridError('invalid-state', 'refreshCells parameters must be an object.');
  }
  assertKnownKeys(params, ['rowIds', 'columnIds'], 'refreshCells parameters', 'invalid-state');
  return {
    rowIds: readRequestedIds(params, 'rowIds', allRowIds, (id) => knownRows.has(id), 'invalid-row'),
    columnIds: readRequestedIds(
      params,
      'columnIds',
      allColumnIds,
      (id) => columns.getColumn(id) !== undefined,
      'invalid-column',
    ),
  };
}

function sameRuntimeRecords<TData extends RowData>(
  left: readonly ColumnRecord<TData>[],
  right: readonly ColumnRecord<TData>[],
): boolean {
  if (left === right) {
    return true;
  }
  if (left.length !== right.length) {
    return false;
  }
  for (let index = 0; index < left.length; index += 1) {
    const current = left[index];
    const next = right[index];
    if (current === undefined || next === undefined) {
      return false;
    }
    if (current === next) {
      continue;
    }
    if (
      current.comparator !== next.comparator ||
      current.filterPredicate !== next.filterPredicate ||
      current.initialSort !== next.initialSort
    ) {
      return false;
    }
    if (
      !sameColumnDefinition(current.definition, next.definition) ||
      !sameColumnState(current.state, next.state)
    ) {
      return false;
    }
  }
  return true;
}

function readRequestedIds(
  source: Record<string, unknown>,
  key: string,
  fallback: readonly string[],
  exists: (id: string) => boolean,
  code: 'invalid-row' | 'invalid-column',
): readonly string[] {
  if (!Object.hasOwn(source, key)) {
    return fallback;
  }
  const value = source[key];
  if (!isUnknownArray(value)) {
    throw new GridError(code, `${key} must be an array.`);
  }
  const seen = new Set<string>();
  const ids: string[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const id = value[index];
    if (typeof id !== 'string' || id.trim().length === 0) {
      throw new GridError(code, `${key} ${index} must be a non-empty string.`);
    }
    if (seen.has(id)) {
      throw new GridError(code, `Duplicate ${key} entry "${id}".`);
    }
    if (!exists(id)) {
      throw new GridError(code, `Unknown ${key} entry "${id}".`);
    }
    seen.add(id);
    ids.push(id);
  }
  return ids;
}
