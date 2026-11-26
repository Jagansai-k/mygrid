import type {
  ColumnState,
  GridApi,
  GridColumn,
  NumberFilterOperator,
  RowData,
  SortDirection,
} from '@inno-grid/mygrid-core';
import type { CSSProperties, MouseEvent, ReactNode } from 'react';
import { useEffect, useState } from 'react';
import type { MyGridProps, MyGridVirtualMetrics } from './grid-props';
import { useScrollBox } from './use-scroll-box';
import {
  DEFAULT_COLUMN_OVERSCAN,
  DEFAULT_HEADER_HEIGHT,
  DEFAULT_ROW_HEIGHT,
  DEFAULT_ROW_OVERSCAN,
  SELECTION_COLUMN_WIDTH,
  columnWindow,
  resolvedColumnWidth,
  rowWindow,
} from './virtual-window';
import type { SizedColumn } from './virtual-window';

const NUMBER_OPERATORS = ['equals', 'greaterThan', 'lessThan'] as const;

type NumberUiOperator = (typeof NUMBER_OPERATORS)[number];

export function GridView<TData extends RowData, TContext>({
  api,
  children,
  loading = false,
  numberFilterColumns,
  multiSortKey = 'ctrl',
  label = 'Data grid',
  rowHeight,
  headerHeight,
  rowOverscan = DEFAULT_ROW_OVERSCAN,
  columnOverscan = DEFAULT_COLUMN_OVERSCAN,
  virtualizeRows = true,
  virtualizeColumns = true,
  onVirtualMetrics,
}: {
  api: GridApi<TData, TContext>;
  children?: ReactNode;
  loading?: boolean;
  numberFilterColumns?: readonly string[];
  multiSortKey?: MyGridProps<TData, TContext>['multiSortKey'];
  label?: string;
  rowHeight?: number;
  headerHeight?: number;
  rowOverscan?: number;
  columnOverscan?: number;
  virtualizeRows?: boolean;
  virtualizeColumns?: boolean;
  onVirtualMetrics?: (metrics: MyGridVirtualMetrics) => void;
}) {
  const mode = api.getGridState().configuration.selectionMode;
  const columns = visibleColumns(api);
  const selection = mode !== 'none';
  const offsets = pinOffsets(columns, selection);
  const page = api.getCurrentPage();
  const pageCount = api.getPageCount();
  const filteredCount = api.getFilteredRowCount();
  const pageRowCount = api.getPaginatedRowCount();
  const { setNode, box, scrollToTop } = useScrollBox();
  const [measuredRow, setMeasuredRow] = useState(0);
  const [measuredHeader, setMeasuredHeader] = useState(0);
  const rowHeightPx = rowHeight ?? (measuredRow > 0 ? measuredRow : DEFAULT_ROW_HEIGHT);
  const headerHeightPx =
    headerHeight ?? (measuredHeader > 0 ? measuredHeader : DEFAULT_HEADER_HEIGHT);
  const rows = virtualizeRows
    ? rowWindow(box.top, box.height, headerHeightPx, rowHeightPx, pageRowCount, rowOverscan)
    : { start: 0, end: pageRowCount };
  const sized = sizedColumns(columns);
  const selectionWidth = selection ? SELECTION_COLUMN_WIDTH : 0;
  const columnsWindow = virtualizeColumns
    ? columnWindow(sized, box.left, box.width, columnOverscan, selectionWidth)
    : columnWindow(sized, 0, Number.POSITIVE_INFINITY, 0, selectionWidth);
  const pageRows = pageSlice(api, rows.start, rows.end);
  const filteredIds = api.getGridState().displayedRowIds;
  const selectedIds = api.getSelectedRowIds();
  const selectedSet = new Set(selectedIds);
  let selectedFiltered = 0;
  if (selectedSet.size > 0) {
    for (const id of filteredIds) {
      if (selectedSet.has(id)) {
        selectedFiltered += 1;
      }
    }
  }
  const allFilteredSelected = filteredIds.length > 0 && selectedFiltered === filteredIds.length;
  const someFilteredSelected = selectedFiltered > 0 && !allFilteredSelected;
  const selectAllDisabled =
    filteredIds.length === 0 || (mode === 'single' && filteredIds.length !== 1);
  const focusedId = api.getFocusedCell()?.rowId ?? null;
  const renderedColumnSlots =
    (selection ? 1 : 0) +
    columnsWindow.left.length +
    (columnsWindow.leftSpacer > 0 ? 1 : 0) +
    columnsWindow.center.length +
    (columnsWindow.rightSpacer > 0 ? 1 : 0) +
    columnsWindow.right.length;
  const columnCount = Math.max(renderedColumnSlots, 1);
  const showEmpty = !loading && pageRowCount === 0;
  const topSpace = rows.start * rowHeightPx;
  const bottomSpace = (pageRowCount - rows.end) * rowHeightPx;

  useEffect(() => {
    scrollToTop();
  }, [page, scrollToTop]);

  useEffect(() => {
    if (onVirtualMetrics === undefined) {
      return;
    }
    onVirtualMetrics({
      totalRows: pageRowCount,
      renderedRows: pageRows.length,
      totalColumns: columns.length,
      renderedColumns: columnsWindow.renderedCount,
      scrollTop: box.top,
      scrollLeft: box.left,
    });
  }, [
    onVirtualMetrics,
    pageRowCount,
    pageRows.length,
    columns.length,
    columnsWindow.renderedCount,
    box.top,
    box.left,
  ]);

  return (
    <>
      {children}
      <div className="mygrid-toolbar">
        <fieldset className="mygrid-columns">
          <legend className="mygrid-sr">Columns</legend>
          {api.getColumnState().map((state) => (
            <ColumnVisibility key={state.colId} api={api} state={state} />
          ))}
        </fieldset>
      </div>
      <div
        className="mygrid-scroll"
        ref={setNode}
        data-rendered-rows={pageRows.length}
        data-total-rows={pageRowCount}
        data-rendered-columns={columnsWindow.renderedCount}
        data-total-columns={columns.length}
        data-scroll-top={box.top}
        data-scroll-left={box.left}
        data-scroll-width={columnsWindow.totalWidth}
      >
        <table
          aria-label={label}
          aria-busy={loading}
          aria-rowcount={pageRowCount + 1}
          style={{ width: columnsWindow.totalWidth, minWidth: '100%' }}
        >
          <thead
            ref={(node) => {
              const height = node?.getBoundingClientRect().height ?? 0;
              if (
                headerHeight === undefined &&
                height >= 1 &&
                Math.round(height) !== measuredHeader
              ) {
                setMeasuredHeader(Math.round(height));
              }
            }}
          >
            <tr>
              {selection ? (
                <th className="mygrid-check mygrid-pin-left" scope="col" style={{ left: 0 }}>
                  <SelectionBox
                    checked={allFilteredSelected}
                    indeterminate={someFilteredSelected}
                    disabled={selectAllDisabled}
                    label="Select all filtered rows"
                    onChange={() => {
                      toggleFilteredSelection(api, filteredIds, allFilteredSelected);
                    }}
                  />
                </th>
              ) : null}
              {columnsWindow.left.map((sized) => (
                <HeaderCell
                  key={sized.colId}
                  api={api}
                  columns={columns}
                  sized={sized}
                  offsets={offsets}
                  numberFilterColumns={numberFilterColumns}
                  multiSortKey={multiSortKey}
                />
              ))}
              {columnsWindow.leftSpacer > 0 ? (
                <th
                  className="mygrid-col-spacer"
                  aria-hidden="true"
                  style={spacerStyle(columnsWindow.leftSpacer)}
                />
              ) : null}
              {columnsWindow.center.map((sized) => (
                <HeaderCell
                  key={sized.colId}
                  api={api}
                  columns={columns}
                  sized={sized}
                  offsets={offsets}
                  numberFilterColumns={numberFilterColumns}
                  multiSortKey={multiSortKey}
                />
              ))}
              {columnsWindow.rightSpacer > 0 ? (
                <th
                  className="mygrid-col-spacer"
                  aria-hidden="true"
                  style={spacerStyle(columnsWindow.rightSpacer)}
                />
              ) : null}
              {columnsWindow.right.map((sized) => (
                <HeaderCell
                  key={sized.colId}
                  api={api}
                  columns={columns}
                  sized={sized}
                  offsets={offsets}
                  numberFilterColumns={numberFilterColumns}
                  multiSortKey={multiSortKey}
                />
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && pageRowCount === 0 ? (
              <tr>
                <td colSpan={columnCount}>Loading</td>
              </tr>
            ) : null}
            {showEmpty ? (
              <tr>
                <td colSpan={columnCount}>No rows to show.</td>
              </tr>
            ) : null}
            {topSpace > 0 ? (
              <tr className="mygrid-spacer" aria-hidden="true">
                <td colSpan={columnCount} style={spacerRowStyle(topSpace)} />
              </tr>
            ) : null}
            {pageRows.map((node, index) => (
              <tr
                key={node.id}
                data-row-id={node.id}
                data-selected={api.isRowSelected(node.id) ? 'true' : 'false'}
                data-focused={node.id === focusedId ? 'true' : 'false'}
                aria-rowindex={rows.start + index + 2}
                ref={
                  index === 0
                    ? (nodeElement) => {
                        const height = nodeElement?.getBoundingClientRect().height ?? 0;
                        if (
                          rowHeight === undefined &&
                          height >= 1 &&
                          Math.round(height) !== measuredRow
                        ) {
                          setMeasuredRow(Math.round(height));
                        }
                      }
                    : undefined
                }
              >
                {selection ? (
                  <td className="mygrid-check mygrid-pin-left" style={{ left: 0 }}>
                    <SelectionBox
                      checked={api.isRowSelected(node.id)}
                      indeterminate={false}
                      disabled={false}
                      label={`Select row ${node.id}`}
                      onChange={() => {
                        api.toggleRowSelection(node.id);
                      }}
                    />
                  </td>
                ) : null}
                {columnsWindow.left.map((sized) => (
                  <BodyCell
                    key={sized.colId}
                    data={node.data}
                    columns={columns}
                    sized={sized}
                    offsets={offsets}
                  />
                ))}
                {columnsWindow.leftSpacer > 0 ? (
                  <td
                    className="mygrid-col-spacer"
                    aria-hidden="true"
                    style={spacerStyle(columnsWindow.leftSpacer)}
                  />
                ) : null}
                {columnsWindow.center.map((sized) => (
                  <BodyCell
                    key={sized.colId}
                    data={node.data}
                    columns={columns}
                    sized={sized}
                    offsets={offsets}
                  />
                ))}
                {columnsWindow.rightSpacer > 0 ? (
                  <td
                    className="mygrid-col-spacer"
                    aria-hidden="true"
                    style={spacerStyle(columnsWindow.rightSpacer)}
                  />
                ) : null}
                {columnsWindow.right.map((sized) => (
                  <BodyCell
                    key={sized.colId}
                    data={node.data}
                    columns={columns}
                    sized={sized}
                    offsets={offsets}
                  />
                ))}
              </tr>
            ))}
            {bottomSpace > 0 ? (
              <tr className="mygrid-spacer" aria-hidden="true">
                <td colSpan={columnCount} style={spacerRowStyle(bottomSpace)} />
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <div className="mygrid-footer">
        <p className="mygrid-status" role="status">
          {loading ? 'Loading. ' : ''}
          {showEmpty ? 'No rows to show. ' : ''}
          {filteredCount} filtered rows
          {selection ? `, ${String(selectedIds.length)} selected` : ''}
        </p>
        <div>
          <button
            type="button"
            onClick={() => {
              api.firstPage();
            }}
            disabled={page <= 0}
          >
            First page
          </button>
          <button
            type="button"
            onClick={() => {
              api.previousPage();
            }}
            disabled={page <= 0}
          >
            Previous page
          </button>
          <span>
            Page {pageCount === 0 ? 0 : page + 1} of {pageCount}
          </span>
          <button
            type="button"
            onClick={() => {
              api.nextPage();
            }}
            disabled={pageCount === 0 || page >= pageCount - 1}
          >
            Next page
          </button>
          <button
            type="button"
            onClick={() => {
              api.lastPage();
            }}
            disabled={pageCount === 0 || page >= pageCount - 1}
          >
            Last page
          </button>
          <label>
            Rows per page{' '}
            <select
              aria-label="Rows per page"
              value={api.getPageSize()}
              onChange={(event) => {
                api.setPageSize(Number(event.target.value));
              }}
            >
              {api.getGridState().pagination.pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
    </>
  );
}

function ColumnHeader<TData extends RowData, TContext>({
  api,
  column,
  style,
  numberFilter,
  multiSortKey,
}: {
  api: GridApi<TData, TContext>;
  column: GridColumn<TData>;
  style: CSSProperties;
  numberFilter: boolean;
  multiSortKey: 'ctrl' | 'shift';
}) {
  const sort = api.getSortModel().find((item) => item.colId === column.colId);
  const filtered = api.getFilterModel().filters.some((item) => item.colId === column.colId);
  const direction = sort?.sort ?? null;
  const name = column.headerName;

  return (
    <th
      scope="col"
      style={style}
      className={pinClass(column.pinned)}
      data-filtered={filtered ? 'true' : 'false'}
      {...(column.sortable ? { 'aria-sort': ariaSort(direction) } : {})}
    >
      {column.sortable ? (
        <button
          type="button"
          className="mygrid-sort"
          aria-label={nextSortLabel(name, direction)}
          onClick={(event) => {
            api.toggleSort(column.colId, isMultiSort(event, multiSortKey));
          }}
        >
          {name}
          <span aria-hidden="true">{sortMark(direction, sort?.sortIndex ?? null)}</span>
        </button>
      ) : (
        name
      )}
      {column.filterable ? (
        numberFilter ? (
          <NumberFilter api={api} columnId={column.colId} />
        ) : (
          <TextFilter api={api} columnId={column.colId} name={name} />
        )
      ) : null}
    </th>
  );
}

function TextFilter<TData extends RowData, TContext>({
  api,
  columnId,
  name,
}: {
  api: GridApi<TData, TContext>;
  columnId: string;
  name: string;
}) {
  return (
    <span className="mygrid-filter">
      <input
        aria-label={`Filter ${name}`}
        value={textFilterValue(api, columnId)}
        onChange={(event) => {
          const value = event.target.value;
          if (value === '') {
            api.clearColumnFilter(columnId);
            return;
          }
          api.setColumnFilter(columnId, {
            filterType: 'text',
            conditions: [{ type: 'contains', filter: value }],
          });
        }}
      />
      <button
        type="button"
        aria-label={`Clear filter ${name}`}
        onClick={() => {
          api.clearColumnFilter(columnId);
        }}
      >
        Clear
      </button>
    </span>
  );
}

function NumberFilter<TData extends RowData, TContext>({
  api,
  columnId,
}: {
  api: GridApi<TData, TContext>;
  columnId: string;
}) {
  const current = numberFilterValue(api, columnId);
  const [draftOperator, setDraftOperator] = useState<NumberUiOperator>('equals');
  const operator = current.value === '' ? draftOperator : current.operator;
  return (
    <span className="mygrid-filter">
      <select
        aria-label={`Filter operator ${columnId}`}
        value={operator}
        onChange={(event) => {
          const next = event.target.value as NumberUiOperator;
          setDraftOperator(next);
          if (current.value !== '') {
            applyNumberFilter(api, columnId, next, current.value);
          }
        }}
      >
        {NUMBER_OPERATORS.map((operator) => (
          <option key={operator} value={operator}>
            {operator}
          </option>
        ))}
      </select>
      <input
        aria-label={`Filter ${columnId}`}
        inputMode="decimal"
        value={current.value}
        onChange={(event) => {
          applyNumberFilter(api, columnId, operator, event.target.value);
        }}
      />
      <button
        type="button"
        aria-label={`Clear filter ${columnId}`}
        onClick={() => {
          api.clearColumnFilter(columnId);
        }}
      >
        Clear
      </button>
    </span>
  );
}

function ColumnVisibility<TData extends RowData, TContext>({
  api,
  state,
}: {
  api: GridApi<TData, TContext>;
  state: ColumnState;
}) {
  const column = api.getColumn(state.colId);
  const name = column?.headerName ?? state.colId;
  return (
    <label>
      <input
        type="checkbox"
        aria-label={`Show ${name}`}
        checked={!state.hide}
        onChange={() => {
          api.setColumnState([
            {
              colId: state.colId,
              hide: !state.hide,
              width: state.width,
              pinned: state.pinned,
            },
          ]);
        }}
      />
      {name}
    </label>
  );
}

function SelectionBox({
  checked,
  indeterminate,
  disabled,
  label,
  onChange,
}: {
  checked: boolean;
  indeterminate: boolean;
  disabled: boolean;
  label: string;
  onChange: () => void;
}) {
  return (
    <input
      type="checkbox"
      aria-label={label}
      checked={checked}
      disabled={disabled}
      ref={(node) => {
        if (node !== null) {
          node.indeterminate = indeterminate;
        }
      }}
      onChange={() => {
        onChange();
      }}
    />
  );
}

function toggleFilteredSelection<TData extends RowData, TContext>(
  api: GridApi<TData, TContext>,
  filteredIds: readonly string[],
  allSelected: boolean,
): void {
  if (allSelected) {
    const remaining = api.getSelectedRowIds().filter((id) => !filteredIds.includes(id));
    api.setSelectedRowIds(remaining);
    return;
  }
  api.selectAllFilteredRows();
}

function visibleColumns<TData extends RowData, TContext>(
  api: GridApi<TData, TContext>,
): GridColumn<TData>[] {
  const columns: GridColumn<TData>[] = [];
  for (const state of api.getColumnState()) {
    if (state.hide) {
      continue;
    }
    const column = api.getColumn(state.colId);
    if (column !== undefined) {
      columns.push(column);
    }
  }
  return columns;
}

function HeaderCell<TData extends RowData, TContext>({
  api,
  columns,
  sized,
  offsets,
  numberFilterColumns,
  multiSortKey,
}: {
  api: GridApi<TData, TContext>;
  columns: readonly GridColumn<TData>[];
  sized: SizedColumn;
  offsets: { left: Map<string, number>; right: Map<string, number> };
  numberFilterColumns: readonly string[] | undefined;
  multiSortKey: 'ctrl' | 'shift';
}) {
  const column = columns.find((entry) => entry.colId === sized.colId);
  if (column === undefined) {
    return null;
  }
  return (
    <ColumnHeader
      api={api}
      column={column}
      style={columnStyle(column, offsets)}
      numberFilter={numberFilterColumns?.includes(column.colId) === true}
      multiSortKey={multiSortKey}
    />
  );
}

function BodyCell<TData extends RowData>({
  data,
  columns,
  sized,
  offsets,
}: {
  data: TData;
  columns: readonly GridColumn<TData>[];
  sized: SizedColumn;
  offsets: { left: Map<string, number>; right: Map<string, number> };
}) {
  const column = columns.find((entry) => entry.colId === sized.colId);
  if (column === undefined) {
    return null;
  }
  return <td style={columnStyle(column, offsets)}>{cellText(readField(data, column.field))}</td>;
}

function spacerStyle(width: number): CSSProperties {
  return { width, minWidth: width, maxWidth: width, padding: 0, border: 0 };
}

function spacerRowStyle(height: number): CSSProperties {
  return { height, padding: 0, border: 0, lineHeight: 0 };
}

function sizedColumns<TData extends RowData>(columns: readonly GridColumn<TData>[]): SizedColumn[] {
  return columns.map((column) => ({
    colId: column.colId,
    width: resolvedColumnWidth(column),
    pinned: column.pinned,
  }));
}

function pageSlice<TData extends RowData, TContext>(
  api: GridApi<TData, TContext>,
  start: number,
  end: number,
) {
  const nodes = [];
  for (let index = start; index < end; index += 1) {
    const node = api.getRowNodeAtPageIndex(index);
    if (node !== undefined) {
      nodes.push(node);
    }
  }
  return nodes;
}

function pinOffsets<TData extends RowData>(
  columns: readonly GridColumn<TData>[],
  selection: boolean,
): { left: Map<string, number>; right: Map<string, number> } {
  const left = new Map<string, number>();
  let cursor = selection ? SELECTION_COLUMN_WIDTH : 0;
  for (const column of columns) {
    if (column.pinned !== 'left') {
      continue;
    }
    left.set(column.colId, cursor);
    cursor += resolvedColumnWidth(column);
  }
  const right = new Map<string, number>();
  cursor = 0;
  for (let index = columns.length - 1; index >= 0; index -= 1) {
    const column = columns[index];
    if (column?.pinned !== 'right') {
      continue;
    }
    right.set(column.colId, cursor);
    cursor += resolvedColumnWidth(column);
  }
  return { left, right };
}

function columnStyle<TData extends RowData>(
  column: GridColumn<TData>,
  offsets: { left: Map<string, number>; right: Map<string, number> },
): CSSProperties {
  const width = resolvedColumnWidth(column);
  const style: CSSProperties = { width };
  if (column.minWidth !== null) {
    style.minWidth = column.minWidth;
  }
  if (column.maxWidth !== null) {
    style.maxWidth = column.maxWidth;
  }
  const left = offsets.left.get(column.colId);
  if (left !== undefined) {
    style.left = left;
  }
  const right = offsets.right.get(column.colId);
  if (right !== undefined) {
    style.right = right;
  }
  return style;
}

function pinClass(pinned: GridColumn<RowData>['pinned']): string {
  if (pinned === 'left') {
    return 'mygrid-pin-left';
  }
  if (pinned === 'right') {
    return 'mygrid-pin-right';
  }
  return '';
}

function ariaSort(direction: SortDirection | null): 'ascending' | 'descending' | 'none' {
  if (direction === 'asc') {
    return 'ascending';
  }
  if (direction === 'desc') {
    return 'descending';
  }
  return 'none';
}

function nextSortLabel(name: string, direction: SortDirection | null): string {
  if (direction === 'asc') {
    return `Sort ${name} descending`;
  }
  if (direction === 'desc') {
    return `Clear sort on ${name}`;
  }
  return `Sort ${name} ascending`;
}

function sortMark(direction: SortDirection | null, sortIndex: number | null): string {
  if (direction === 'asc') {
    return sortIndex === null ? '▲' : `▲${String(sortIndex + 1)}`;
  }
  if (direction === 'desc') {
    return sortIndex === null ? '▼' : `▼${String(sortIndex + 1)}`;
  }
  return '';
}

function isMultiSort(event: MouseEvent<HTMLButtonElement>, key: 'ctrl' | 'shift'): boolean {
  if (key === 'shift') {
    return event.shiftKey;
  }
  return event.ctrlKey || event.metaKey;
}

function textFilterValue<TData extends RowData, TContext>(
  api: GridApi<TData, TContext>,
  columnId: string,
): string {
  const item = api.getFilterModel().filters.find((entry) => entry.colId === columnId);
  if (item?.filter.filterType !== 'text') {
    return '';
  }
  return item.filter.conditions[0]?.filter ?? '';
}

function numberFilterValue<TData extends RowData, TContext>(
  api: GridApi<TData, TContext>,
  columnId: string,
): { operator: NumberUiOperator; value: string } {
  const item = api.getFilterModel().filters.find((entry) => entry.colId === columnId);
  if (item?.filter.filterType !== 'number') {
    return { operator: 'equals', value: '' };
  }
  const condition = item.filter.conditions[0];
  const operator = isNumberUiOperator(condition?.type) ? condition.type : 'equals';
  return { operator, value: condition === undefined ? '' : String(condition.filter) };
}

function applyNumberFilter<TData extends RowData, TContext>(
  api: GridApi<TData, TContext>,
  columnId: string,
  operator: NumberUiOperator,
  raw: string,
): void {
  if (raw.trim() === '') {
    api.clearColumnFilter(columnId);
    return;
  }
  const value = Number(raw);
  if (!Number.isFinite(value)) {
    return;
  }
  api.setColumnFilter(columnId, {
    filterType: 'number',
    conditions: [{ type: operator, filter: value }],
  });
}

function isNumberUiOperator(value: NumberFilterOperator | undefined): value is NumberUiOperator {
  return value !== undefined && NUMBER_OPERATORS.some((operator) => operator === value);
}

function readField(data: RowData, field: string | null): unknown {
  if (field === null || !Object.hasOwn(data, field)) {
    return undefined;
  }
  return Object.getOwnPropertyDescriptor(data, field)?.value as unknown;
}

function cellText(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }
  return '';
}
