/** @vitest-environment jsdom */
import type { ColumnDefinition, GridApi } from '@inno-grid/mygrid-core';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { StrictMode, type ComponentProps } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MyGrid } from './index';

interface Row {
  id: string;
  name: string;
  note: string;
}

const columns: ColumnDefinition<Row>[] = [
  { field: 'name', pinned: 'left', width: 100, sortable: true, filterable: true },
  { field: 'note', width: 100 },
];

function rowsOf(count: number): Row[] {
  return Array.from({ length: count }, (_, index) => ({
    id: String(index),
    name: `name-${String(index)}`,
    note: `note-${String(index)}`,
  }));
}

function mountedRows(): number {
  return document.querySelectorAll('tbody tr[data-row-id]').length;
}

function scroller(): HTMLElement {
  const node = document.querySelector('.mygrid-scroll');
  if (!(node instanceof HTMLElement)) {
    throw new Error('Missing scroll container');
  }
  return node;
}

function sizeScroller(width: number, height: number): void {
  Object.defineProperty(scroller(), 'clientWidth', { configurable: true, value: width });
  Object.defineProperty(scroller(), 'clientHeight', { configurable: true, value: height });
}

async function flushFrame(): Promise<void> {
  await act(async () => {
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        resolve();
      });
    });
  });
}

async function scrollTo(top: number, left = 0): Promise<void> {
  const node = scroller();
  node.scrollTop = top;
  node.scrollLeft = left;
  fireEvent.scroll(node);
  await flushFrame();
}

function Grid({
  count,
  extraColumns = [],
  ...props
}: {
  count: number;
  extraColumns?: ColumnDefinition<Row>[];
} & Partial<ComponentProps<typeof MyGrid<Row>>>) {
  return (
    <MyGrid<Row>
      columnDefs={[...columns, ...extraColumns]}
      rowData={rowsOf(count)}
      rowHeight={40}
      headerHeight={44}
      height={240}
      {...props}
    />
  );
}

describe('row and column virtualization', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('renders the initial visible range plus overscan', async () => {
    render(<Grid count={1000} rowOverscan={1} />);
    sizeScroller(500, 200);
    await scrollTo(0);

    expect(mountedRows()).toBe(5);
    expect(screen.getByText('name-0')).toBeTruthy();
    expect(screen.queryByText('name-6')).toBeNull();
  });

  it('renders a lower range after scrolling down and restores it when scrolling up', async () => {
    render(<Grid count={1000} rowOverscan={1} />);
    sizeScroller(500, 200);
    await scrollTo(2000);
    expect(mountedRows()).toBe(8);
    expect(screen.getByText('name-47')).toBeTruthy();
    expect(screen.queryByText('name-0')).toBeNull();

    await scrollTo(400);
    expect(screen.getByText('name-7')).toBeTruthy();
    expect(screen.queryByText('name-47')).toBeNull();
  });

  it('mounts more rows when overscan grows', async () => {
    const { rerender } = render(<Grid count={1000} rowOverscan={0} />);
    sizeScroller(500, 200);
    await scrollTo(2000);
    const tight = mountedRows();
    rerender(<Grid count={1000} rowOverscan={6} />);
    await scrollTo(2000);
    expect(mountedRows()).toBeGreaterThan(tight);
  });

  it('mounts every row when row virtualization is off', async () => {
    render(<Grid count={40} rowOverscan={0} virtualizeRows={false} />);
    sizeScroller(500, 120);
    await scrollTo(800);
    expect(mountedRows()).toBe(40);
  });

  it('renders an empty dataset and a dataset smaller than the viewport', () => {
    const { rerender } = render(<Grid count={0} />);
    expect(screen.getByText('No rows to show.')).toBeTruthy();
    expect(mountedRows()).toBe(0);

    rerender(<Grid count={2} />);
    expect(mountedRows()).toBe(2);
    expect(screen.getByText('name-1')).toBeTruthy();
  });

  it('does not mount a 100,000-row dataset', async () => {
    render(<Grid count={100000} rowOverscan={2} />);
    sizeScroller(500, 200);
    await scrollTo(0);
    expect(mountedRows()).toBeLessThan(30);
    expect(Number(scroller().dataset.totalRows)).toBe(100000);
    expect(screen.queryByText('name-99999')).toBeNull();
  });

  it('renders more rows when the container grows', async () => {
    const observers: ResizeObserverCallback[] = [];
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: ResizeObserverCallback) {
          observers.push(callback);
        }
        observe(): void {
          return undefined;
        }
        disconnect(): void {
          return undefined;
        }
        unobserve(): void {
          return undefined;
        }
      },
    );
    render(<Grid count={1000} rowOverscan={1} />);
    sizeScroller(500, 200);
    await scrollTo(0);
    const before = mountedRows();
    sizeScroller(500, 800);
    act(() => {
      observers[0]?.([], {} as ResizeObserver);
    });
    await flushFrame();
    expect(mountedRows()).toBeGreaterThan(before);
  });

  it('virtualizes the current page and resets the window when the page changes', async () => {
    render(
      <Grid
        count={30}
        rowOverscan={0}
        pagination={{ enabled: true, pageSize: 10, pageSizeOptions: [10] }}
      />,
    );
    sizeScroller(500, 120);
    await scrollTo(200);
    expect(screen.queryByText('name-0')).toBeNull();
    expect(screen.queryByText('name-10')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    await flushFrame();
    expect(Number(scroller().dataset.scrollTop)).toBe(0);
    expect(screen.getByText('name-10')).toBeTruthy();
    expect(screen.queryByText('name-20')).toBeNull();
    expect(Number(scroller().dataset.totalRows)).toBe(10);
  });

  it('updates the window after sorting and filtering', () => {
    render(<Grid count={5} />);
    expect(screen.getByText('name-0')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Sort name ascending' }));
    fireEvent.click(screen.getByRole('button', { name: 'Sort name descending' }));
    expect(screen.getByText('name-4')).toBeTruthy();

    fireEvent.change(screen.getByRole('textbox', { name: 'Filter name' }), {
      target: { value: 'name-1' },
    });
    expect(screen.getByText('name-1')).toBeTruthy();
    expect(screen.queryByText('name-0')).toBeNull();
    expect(mountedRows()).toBe(1);
  });
});

describe('column virtualization in the table', () => {
  afterEach(() => {
    cleanup();
  });

  const wide: ColumnDefinition<Row>[] = [
    { field: 'name', colId: 'left', pinned: 'left', width: 100, headerName: 'Left' },
    ...Array.from({ length: 12 }, (_, index) => ({
      colId: `c${String(index)}`,
      field: 'note' as const,
      width: 100,
      headerName: `Center ${String(index)}`,
    })),
    { field: 'note', colId: 'right', pinned: 'right', width: 100, headerName: 'Right' },
  ];

  it('keeps pinned columns and windows the center', async () => {
    render(
      <MyGrid<Row>
        columnDefs={wide}
        rowData={rowsOf(2)}
        rowHeight={40}
        headerHeight={44}
        columnOverscan={0}
        selection={{ mode: 'none' }}
      />,
    );
    sizeScroller(300, 200);
    await scrollTo(0, 0);
    expect(screen.getByRole('columnheader', { name: 'Left' })).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: 'Right' })).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: 'Center 0' })).toBeTruthy();
    expect(screen.queryByRole('columnheader', { name: 'Center 8' })).toBeNull();
    expect(Number(scroller().dataset.renderedColumns)).toBeLessThan(12);
    expect(Number(scroller().dataset.scrollWidth)).toBe(100 + 1200 + 100);

    await scrollTo(0, 500);
    expect(screen.getByRole('columnheader', { name: 'Left' })).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: 'Right' })).toBeTruthy();
    expect(screen.queryByRole('columnheader', { name: 'Center 0' })).toBeNull();
    expect(screen.getByRole('columnheader', { name: 'Center 4' })).toBeTruthy();
  });

  it('drops hidden columns and follows width changes', async () => {
    let api: GridApi<Row> | null = null;
    render(
      <MyGrid<Row>
        columnDefs={wide}
        rowData={rowsOf(1)}
        rowHeight={40}
        headerHeight={44}
        columnOverscan={8}
        selection={{ mode: 'none' }}
        onGridReady={(event) => {
          api = event.api;
        }}
      />,
    );
    sizeScroller(2000, 200);
    await scrollTo(0, 0);
    expect(screen.getByRole('columnheader', { name: 'Center 3' })).toBeTruthy();
    act(() => {
      api?.setColumnState([{ colId: 'c3', hide: true, width: 100, pinned: null }]);
    });
    expect(screen.queryByRole('columnheader', { name: 'Center 3' })).toBeNull();
    const before = Number(scroller().dataset.scrollWidth);
    act(() => {
      api?.setColumnState([{ colId: 'c4', hide: false, width: 260, pinned: null }]);
    });
    expect(Number(scroller().dataset.scrollWidth)).toBe(before + 160);
  });
});

describe('virtualization integration', () => {
  afterEach(() => {
    cleanup();
  });

  it('keeps selection on the row id while scrolling', async () => {
    render(<Grid count={200} rowOverscan={1} selection={{ mode: 'multiple' }} />);
    sizeScroller(500, 200);
    await scrollTo(0);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select row 1' }));
    await scrollTo(2000);
    expect(screen.queryByRole('checkbox', { name: 'Select row 1' })).toBeNull();
    await scrollTo(0);
    expect(screen.getByRole<HTMLInputElement>('checkbox', { name: 'Select row 1' }).checked).toBe(
      true,
    );
  });

  it('marks the focused row when it re-enters the viewport', async () => {
    let api: GridApi<Row> | null = null;
    render(
      <Grid
        count={200}
        rowOverscan={0}
        onGridReady={(event) => {
          api = event.api;
        }}
      />,
    );
    sizeScroller(500, 200);
    await scrollTo(0);
    act(() => {
      api?.setFocusedCell({ rowIndex: 1, columnId: 'name', rowId: '1' });
    });
    expect(document.querySelector('tr[data-row-id="1"]')?.getAttribute('data-focused')).toBe(
      'true',
    );
    await scrollTo(2000);
    expect(document.querySelector('tr[data-row-id="1"]')).toBeNull();
    await scrollTo(0);
    expect(document.querySelector('tr[data-row-id="1"]')?.getAttribute('data-focused')).toBe(
      'true',
    );
  });

  it('keeps theme and density attributes on a virtualized grid', () => {
    render(<Grid count={20} theme="dark" density="compact" />);
    const root = document.querySelector('[data-mygrid]');
    expect(root?.getAttribute('data-mygrid-theme')).toBe('dark');
    expect(root?.getAttribute('data-mygrid-density')).toBe('compact');
    expect(document.querySelector('table')?.getAttribute('role')).toBeNull();
  });

  it('mounts one table under Strict Mode and cleans up the grid', () => {
    const seen: GridApi<Row>[] = [];
    const { unmount } = render(
      <StrictMode>
        <Grid
          count={10}
          onGridReady={(event) => {
            seen.push(event.api);
          }}
        />
      </StrictMode>,
    );
    expect(screen.getAllByRole('table')).toHaveLength(1);
    expect(mountedRows()).toBe(10);
    unmount();
    const live = seen.at(-1);
    expect(live).toBeDefined();
    expect(() => live?.getDisplayedRowCount()).toThrow(/destroyed/i);
  });
});
