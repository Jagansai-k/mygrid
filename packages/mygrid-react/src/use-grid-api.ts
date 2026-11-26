import { createGrid } from '@inno-grid/mygrid-core';
import type {
  FilterChangedEvent,
  GridApi,
  GridOptions,
  GridReadyEvent,
  PaginationChangedEvent,
  RowData,
  RowDataChangedEvent,
  SelectionChangedEvent,
  SortChangedEvent,
} from '@inno-grid/mygrid-core';
import { useEffect, useRef, useState } from 'react';
import type { MyGridProps } from './grid-props';

/**
 * Owns one core grid for the lifetime of the component.
 * Sorting, filtering, paging, and selection stay on that API.
 * `rowData` and `columnDefs` update the live grid. The other options apply at creation.
 */
export function useGridApi<TData extends RowData, TContext>(
  props: MyGridProps<TData, TContext>,
): GridApi<TData, TContext> | null {
  const propsRef = useRef(props);
  propsRef.current = props;
  const apiRef = useRef<GridApi<TData, TContext> | null>(null);
  const appliedRows = useRef(props.rowData);
  const appliedColumns = useRef(props.columnDefs);
  const [snapshot, setSnapshot] = useState<{
    api: GridApi<TData, TContext> | null;
    tick: number;
  }>({ api: null, tick: 0 });
  const hasColumns = props.columnDefs !== undefined;

  useEffect(() => {
    if (!hasColumns) {
      return;
    }
    const current = propsRef.current;
    const created = createGrid(gridOptions(current));
    if (current.initialState !== undefined) {
      created.setGridState(current.initialState);
    }
    apiRef.current = created;
    appliedRows.current = current.rowData;
    appliedColumns.current = current.columnDefs;
    const refresh = (): void => {
      setSnapshot((current) => ({ api: created, tick: current.tick + 1 }));
    };
    const unsubscribe = created.subscribe(refresh);
    const onReady = (event: GridReadyEvent<TData, TContext>): void => {
      propsRef.current.onGridReady?.(event);
    };
    const onRows = (event: RowDataChangedEvent<TData, TContext>): void => {
      propsRef.current.onRowDataChanged?.(event);
    };
    const onSort = (event: SortChangedEvent<TData, TContext>): void => {
      propsRef.current.onSortChanged?.(event);
    };
    const onFilter = (event: FilterChangedEvent<TData, TContext>): void => {
      propsRef.current.onFilterChanged?.(event);
    };
    const onPage = (event: PaginationChangedEvent<TData, TContext>): void => {
      propsRef.current.onPaginationChanged?.(event);
    };
    const onSelection = (event: SelectionChangedEvent<TData, TContext>): void => {
      propsRef.current.onSelectionChanged?.(event);
    };
    created.addEventListener('gridReady', onReady);
    created.addEventListener('rowDataChanged', onRows);
    created.addEventListener('sortChanged', onSort);
    created.addEventListener('filterChanged', onFilter);
    created.addEventListener('paginationChanged', onPage);
    created.addEventListener('selectionChanged', onSelection);
    refresh();
    return () => {
      unsubscribe();
      created.destroy();
      if (apiRef.current === created) {
        apiRef.current = null;
      }
      setSnapshot({ api: null, tick: 0 });
    };
  }, [hasColumns]);

  useEffect(() => {
    const live = apiRef.current;
    if (live === null || props.rowData === appliedRows.current) {
      return;
    }
    appliedRows.current = props.rowData;
    live.setRowData(props.rowData ?? []);
  }, [props.rowData]);

  useEffect(() => {
    const live = apiRef.current;
    if (
      live === null ||
      props.columnDefs === undefined ||
      props.columnDefs === appliedColumns.current
    ) {
      return;
    }
    appliedColumns.current = props.columnDefs;
    live.setColumnDefs(props.columnDefs);
  }, [props.columnDefs]);

  return snapshot.api;
}

function gridOptions<TData extends RowData, TContext>(
  props: MyGridProps<TData, TContext>,
): GridOptions<TData, TContext> {
  return {
    columnDefs: props.columnDefs ?? [],
    ...(props.rowData === undefined ? {} : { rowData: props.rowData }),
    ...(props.getRowId === undefined ? {} : { getRowId: props.getRowId }),
    ...(props.context === undefined ? {} : { context: props.context }),
    ...(props.sorting === undefined ? {} : { sorting: props.sorting }),
    ...(props.filtering === undefined ? {} : { filtering: props.filtering }),
    ...(props.pagination === undefined ? {} : { pagination: props.pagination }),
    ...(props.selection === undefined ? {} : { selection: props.selection }),
  };
}
