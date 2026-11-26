'use client';

import { MYGRID_CORE_VERSION, MYGRID_LIBRARY_NAME } from '@inno-grid/mygrid-core';
import type { RowData } from '@inno-grid/mygrid-core';
import type { CSSProperties } from 'react';
import { reactGridAdapter } from './adapter';
import { GridView } from './grid-view';
import type { MyGridProps } from './grid-props';
import { useGridApi } from './use-grid-api';
import { MYGRID_REACT_VERSION } from './version';

export type {
  MyGridDensity,
  MyGridFilterKind,
  MyGridProps,
  MyGridTheme,
  MyGridVirtualMetrics,
} from './grid-props';

/**
 * React data grid.
 *
 * Pass `columnDefs` to render headers, rows, and cells from the core grid API.
 * Omit `columnDefs` to keep the mount point and render `children` only.
 * Sorting, filtering, paging, and selection run in `@inno-grid/mygrid-core`.
 * `onGridReady` receives that API. Theme CSS stays in `@inno-grid/mygrid-themes`.
 */
export function MyGrid<TData extends RowData = RowData, TContext = unknown>(
  props: MyGridProps<TData, TContext>,
) {
  const api = useGridApi(props);
  const { className, children, theme, density, columnDefs } = props;
  const style = rootStyle(props);
  const hasStyle = Object.keys(style).length > 0;

  return (
    <div
      {...(className === undefined ? {} : { className })}
      {...(theme === undefined ? {} : { 'data-mygrid-theme': theme })}
      {...(density === undefined ? {} : { 'data-mygrid-density': density })}
      {...(hasStyle ? { style } : {})}
      data-mygrid={MYGRID_LIBRARY_NAME}
      data-mygrid-adapter={reactGridAdapter.framework}
      data-mygrid-core-version={MYGRID_CORE_VERSION}
      data-mygrid-react-version={MYGRID_REACT_VERSION}
    >
      {columnDefs === undefined || api === null ? (
        children
      ) : (
        <GridView
          api={api}
          {...(props.loading === undefined ? {} : { loading: props.loading })}
          {...(props.numberFilterColumns === undefined
            ? {}
            : { numberFilterColumns: props.numberFilterColumns })}
          {...(props.multiSortKey === undefined ? {} : { multiSortKey: props.multiSortKey })}
          {...(props.label === undefined ? {} : { label: props.label })}
          {...(props.rowHeight === undefined ? {} : { rowHeight: props.rowHeight })}
          {...(props.headerHeight === undefined ? {} : { headerHeight: props.headerHeight })}
          {...(props.rowOverscan === undefined ? {} : { rowOverscan: props.rowOverscan })}
          {...(props.columnOverscan === undefined ? {} : { columnOverscan: props.columnOverscan })}
          {...(props.virtualizeRows === undefined ? {} : { virtualizeRows: props.virtualizeRows })}
          {...(props.virtualizeColumns === undefined
            ? {}
            : { virtualizeColumns: props.virtualizeColumns })}
          {...(props.onVirtualMetrics === undefined
            ? {}
            : { onVirtualMetrics: props.onVirtualMetrics })}
        >
          {children}
        </GridView>
      )}
    </div>
  );
}

function rootStyle<TData extends RowData, TContext>(
  props: MyGridProps<TData, TContext>,
): CSSProperties {
  const style: CSSProperties & Record<`--${string}`, string> = {};
  if (typeof props.width === 'number') {
    style.width = `${String(props.width)}px`;
  } else if (props.width !== undefined) {
    style.width = props.width;
  }
  if (typeof props.height === 'number') {
    style.height = `${String(props.height)}px`;
  } else if (props.height !== undefined) {
    style.height = props.height;
  }
  if (props.rowHeight !== undefined) {
    style['--mygrid-row-height'] = `${String(props.rowHeight)}px`;
  }
  if (props.headerHeight !== undefined) {
    style['--mygrid-header-height'] = `${String(props.headerHeight)}px`;
  }
  return style;
}
