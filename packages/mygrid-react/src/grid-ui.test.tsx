/** @vitest-environment jsdom */
import type { ColumnDefinition, GridApi } from '@inno-grid/mygrid-core';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { StrictMode, useState, type ComponentProps } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { MyGrid } from './index';

interface Person {
  id: string;
  name: string;
  department: string;
  salary: number;
}

const rows: Person[] = [
  { id: '1', name: 'Grace', department: 'Research', salary: 120 },
  { id: '2', name: 'Ada', department: 'Engineering', salary: 90 },
  { id: '3', name: 'Alan', department: 'Engineering', salary: 110 },
  { id: '4', name: 'Edsger', department: 'Research', salary: 100 },
  { id: '5', name: 'Barbara', department: 'Design', salary: 80 },
];

const columns: ColumnDefinition<Person>[] = [
  {
    field: 'name',
    sortable: true,
    filterable: true,
    pinned: 'left',
    width: 180,
    minWidth: 80,
    maxWidth: 240,
  },
  { field: 'department', sortable: true, filterable: true },
  { field: 'salary', sortable: true, filterable: true, width: 120 },
];

const paging = { enabled: true, pageSize: 2, pageSizeOptions: [2, 5, 10] };

function PeopleGrid(props: Partial<ComponentProps<typeof MyGrid<Person>>>) {
  return (
    <MyGrid<Person>
      columnDefs={columns}
      rowData={rows}
      pagination={paging}
      numberFilterColumns={['salary']}
      {...props}
    />
  );
}

describe('MyGrid data grid', () => {
  afterEach(() => {
    cleanup();
  });
  it('renders column headers and the first page of cells', () => {
    render(<PeopleGrid />);

    expect(screen.getByRole('table', { name: 'Data grid' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Sort name ascending' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Sort department ascending' })).toBeTruthy();
    expect(screen.getByText('Grace')).toBeTruthy();
    expect(screen.getByText('Ada')).toBeTruthy();
    expect(screen.queryByText('Barbara')).toBeNull();
    expect(screen.getByRole('status').textContent).toContain('5 filtered rows');
    expect(screen.getByText('Page 1 of 3')).toBeTruthy();
  });

  it('shows an empty state', () => {
    render(<PeopleGrid rowData={[]} />);

    expect(screen.getAllByText('No rows to show.').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Next page' }).hasAttribute('disabled')).toBe(true);
  });

  it('shows a loading state', () => {
    render(<PeopleGrid rowData={[]} loading />);

    expect(screen.getByRole('table').getAttribute('aria-busy')).toBe('true');
    expect(screen.getByText('Loading')).toBeTruthy();
  });

  it('cycles sort through the core engine', () => {
    render(<PeopleGrid />);

    fireEvent.click(screen.getByRole('button', { name: 'Sort name ascending' }));
    expect(screen.getByRole('columnheader', { name: /name/i }).getAttribute('aria-sort')).toBe(
      'ascending',
    );
    expect(screen.getByText('Ada')).toBeTruthy();
    expect(screen.queryByText('Grace')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Sort name descending' }));
    expect(screen.getByRole('columnheader', { name: /name/i }).getAttribute('aria-sort')).toBe(
      'descending',
    );
    expect(screen.getByText('Grace')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Clear sort on name' }));
    expect(screen.getByRole('columnheader', { name: /name/i }).getAttribute('aria-sort')).toBe(
      'none',
    );
    expect(screen.getByText('Grace')).toBeTruthy();
    expect(screen.getByText('Ada')).toBeTruthy();
  });

  it('adds a second sort when the modifier is held', () => {
    render(<PeopleGrid />);

    fireEvent.click(screen.getByRole('button', { name: 'Sort department ascending' }));
    fireEvent.click(screen.getByRole('button', { name: 'Sort name ascending' }), { ctrlKey: true });

    expect(
      screen.getByRole('columnheader', { name: /department/i }).getAttribute('aria-sort'),
    ).toBe('ascending');
    expect(screen.getByRole('columnheader', { name: /name/i }).getAttribute('aria-sort')).toBe(
      'ascending',
    );
  });

  it('filters through the core model and can clear the filter', () => {
    render(<PeopleGrid />);

    fireEvent.change(screen.getByRole('textbox', { name: 'Filter department' }), {
      target: { value: 'Design' },
    });

    expect(screen.getByText('Barbara')).toBeTruthy();
    expect(screen.queryByText('Grace')).toBeNull();
    expect(
      screen.getByRole('columnheader', { name: /department/i }).getAttribute('data-filtered'),
    ).toBe('true');
    expect(screen.getByRole('status').textContent).toContain('1 filtered rows');

    fireEvent.click(screen.getByRole('button', { name: 'Clear filter department' }));
    expect(screen.getByText('Grace')).toBeTruthy();
    expect(
      screen.getByRole('columnheader', { name: /department/i }).getAttribute('data-filtered'),
    ).toBe('false');
  });

  it('filters a number column', () => {
    render(<PeopleGrid />);

    fireEvent.change(screen.getByRole('textbox', { name: 'Filter salary' }), {
      target: { value: '100' },
    });
    fireEvent.change(screen.getByRole('combobox', { name: 'Filter operator salary' }), {
      target: { value: 'greaterThan' },
    });

    expect(screen.getByText('Grace')).toBeTruthy();
    expect(screen.getByText('Alan')).toBeTruthy();
    expect(screen.queryByText('Ada')).toBeNull();
    expect(screen.getByRole('status').textContent).toContain('2 filtered rows');
  });

  it('pages with the core page controls', () => {
    render(<PeopleGrid />);

    expect(screen.getByRole('button', { name: 'First page' }).hasAttribute('disabled')).toBe(true);
    expect(screen.getByRole('button', { name: 'Previous page' }).hasAttribute('disabled')).toBe(
      true,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(screen.getByText('Page 2 of 3')).toBeTruthy();
    expect(screen.getByText('Alan')).toBeTruthy();
    expect(screen.queryByText('Grace')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Last page' }));
    expect(screen.getByText('Page 3 of 3')).toBeTruthy();
    expect(screen.getByText('Barbara')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Next page' }).hasAttribute('disabled')).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'First page' }));
    expect(screen.getByText('Grace')).toBeTruthy();

    fireEvent.change(screen.getByRole('combobox', { name: 'Rows per page' }), {
      target: { value: '5' },
    });
    expect(screen.getByText('Page 1 of 1')).toBeTruthy();
    expect(screen.getByText('Barbara')).toBeTruthy();
  });

  it('selects rows by id and supports select-all', () => {
    render(<PeopleGrid />);

    fireEvent.click(screen.getByRole('checkbox', { name: 'Select row 1' }));
    expect(screen.getByRole('status').textContent).toContain('1 selected');

    expect(
      screen.getByRole<HTMLInputElement>('checkbox', { name: 'Select all filtered rows' })
        .indeterminate,
    ).toBe(true);

    fireEvent.click(screen.getByRole('checkbox', { name: 'Select all filtered rows' }));
    expect(screen.getByRole('status').textContent).toContain('5 selected');
    const header = screen.getByRole<HTMLInputElement>('checkbox', {
      name: 'Select all filtered rows',
    });
    expect(header.indeterminate).toBe(false);
    expect(header.checked).toBe(true);

    fireEvent.click(header);
    expect(screen.getByRole('status').textContent).toContain('0 selected');
  });

  it('keeps a single selected row when selection mode is single', () => {
    render(<PeopleGrid selection={{ mode: 'single' }} />);

    const header = screen.getByRole('checkbox', { name: 'Select all filtered rows' });
    expect(header.hasAttribute('disabled')).toBe(true);

    fireEvent.click(screen.getByRole('checkbox', { name: 'Select row 1' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select row 2' }));

    expect(
      screen.getByRole<HTMLInputElement>('checkbox', { name: 'Select row 1' }).checked,
    ).toBe(false);
    expect(
      screen.getByRole<HTMLInputElement>('checkbox', { name: 'Select row 2' }).checked,
    ).toBe(true);
    expect(screen.getByRole('status').textContent).toContain('1 selected');
  });

  it('hides a column without using its display index as identity', () => {
    render(<PeopleGrid />);

    fireEvent.click(screen.getByRole('checkbox', { name: 'Show salary' }));
    expect(screen.queryByRole('columnheader', { name: /salary/i })).toBeNull();
    expect(screen.getByRole('columnheader', { name: /name/i })).toBeTruthy();

    fireEvent.click(screen.getByRole('checkbox', { name: 'Show salary' }));
    expect(screen.getByRole('columnheader', { name: /salary/i })).toBeTruthy();
  });

  it('sets theme, density, and size on the root', () => {
    render(<PeopleGrid theme="dark" density="compact" rowHeight={28} height={320} />);

    const root = screen.getByRole('table').closest('[data-mygrid]');
    if (!(root instanceof HTMLElement)) {
      throw new Error('Grid root was not found.');
    }
    expect(root.getAttribute('data-mygrid-theme')).toBe('dark');
    expect(root.getAttribute('data-mygrid-density')).toBe('compact');
    expect(root.getAttribute('role')).toBeNull();
    expect(root.style.getPropertyValue('--mygrid-row-height')).toBe('28px');
    expect(root.style.height).toBe('320px');

    const nameHeader = screen.getByRole('columnheader', { name: /name/i });
    expect(nameHeader.className).toContain('mygrid-pin-left');
    expect(nameHeader.style.width).toBe('180px');
    expect(nameHeader.style.minWidth).toBe('80px');
    expect(nameHeader.style.maxWidth).toBe('240px');
  });

  it('exposes the core API from onGridReady', () => {
    const ready: { api: GridApi<Person> | null } = { api: null };
    render(
      <PeopleGrid
        onGridReady={(event) => {
          ready.api = event.api;
        }}
      />,
    );

    expect(ready.api?.getFilteredRowCount()).toBe(5);
    expect(ready.api?.getPaginatedRowCount()).toBe(2);
  });

  it('emits sort, filter, page, selection, and row callbacks', () => {
    const seen = { sort: 0, filter: 0, page: 0, selection: 0, rows: 0 };

    function Host() {
      const [data, setData] = useState(rows);
      return (
        <>
          <button
            type="button"
            onClick={() => {
              setData([...rows, { id: '6', name: 'Ida', department: 'Design', salary: 70 }]);
            }}
          >
            Add Ida
          </button>
          <MyGrid<Person>
            columnDefs={columns}
            rowData={data}
            pagination={paging}
            numberFilterColumns={['salary']}
            onSortChanged={() => {
              seen.sort += 1;
            }}
            onFilterChanged={() => {
              seen.filter += 1;
            }}
            onPaginationChanged={() => {
              seen.page += 1;
            }}
            onSelectionChanged={() => {
              seen.selection += 1;
            }}
            onRowDataChanged={() => {
              seen.rows += 1;
            }}
          />
        </>
      );
    }

    render(<Host />);
    fireEvent.click(screen.getByRole('button', { name: 'Sort name ascending' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Filter department' }), {
      target: { value: 'e' },
    });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select row 2' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add Ida' }));

    expect(seen).toEqual({ sort: 1, filter: 1, page: 1, selection: 1, rows: 1 });
    expect(screen.getByRole('status').textContent).toContain('6 filtered rows');
  });

  it('applies a new row list without recreating the grid', () => {
    const seen: GridApi<Person>[] = [];
    const { rerender } = render(
      <PeopleGrid
        onGridReady={(event) => {
          seen.push(event.api);
        }}
      />,
    );
    rerender(
      <PeopleGrid
        rowData={[...rows, { id: '6', name: 'Ida', department: 'Design', salary: 70 }]}
        onGridReady={(event) => {
          seen.push(event.api);
        }}
      />,
    );

    expect(seen).toHaveLength(1);
    expect(screen.getByRole('status').textContent).toContain('6 filtered rows');
  });

  it('destroys the API and drops subscriptions on unmount', () => {
    let api: GridApi<Person> | null = null;
    const { unmount } = render(
      <PeopleGrid
        onGridReady={(event) => {
          api = event.api;
        }}
      />,
    );

    unmount();
    expect(() => api?.getRowCount()).toThrow(/destroyed/i);
  });

  it('renders one table under Strict Mode', () => {
    const ready: GridApi<Person>[] = [];
    render(
      <StrictMode>
        <PeopleGrid
          pagination={{ enabled: true, pageSize: 5, pageSizeOptions: [5, 10] }}
          onGridReady={(event) => {
            ready.push(event.api);
          }}
        />
      </StrictMode>,
    );

    expect(screen.getAllByRole('table')).toHaveLength(1);
    expect(screen.getAllByText('Grace')).toHaveLength(1);
    const live = ready[ready.length - 1];
    expect(live?.getRowCount()).toBe(5);
    fireEvent.click(screen.getByRole('button', { name: 'Sort name ascending' }));
    expect(screen.getAllByText('Ada').length).toBeGreaterThan(0);
  });

  it('keeps sort, filter, and selection controls keyboard-labelled', () => {
    render(<PeopleGrid />);

    expect(screen.getByRole('columnheader', { name: /name/i }).getAttribute('aria-sort')).toBe(
      'none',
    );
    expect(screen.getByRole('checkbox', { name: 'Select all filtered rows' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeTruthy();
    expect(screen.getByRole('textbox', { name: 'Filter name' })).toBeTruthy();
  });
});
