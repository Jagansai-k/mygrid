import { describe, expect, it } from 'vitest';
import { createGrid } from '../grid/create-grid';
import { restoreGridState, serializeGridState } from '../persistence/serialize';
import type { ColumnDefinition } from '../types';

interface Person {
  id: number;
  name: string;
  department: string;
  salary: number;
}

const columns: ColumnDefinition<Person>[] = [
  { field: 'name', sortable: true, filterable: true },
  { field: 'department', sortable: true, filterable: true },
  { field: 'salary', sortable: true, filterable: true },
];

function person(id: number, name: string, department = 'Apps', salary = id): Person {
  return { id, name, department, salary };
}

function people(count: number): Person[] {
  return Array.from({ length: count }, (_, index) =>
    person(index + 1, `n${index + 1}`, index % 2 === 0 ? 'Apps' : 'Research', index + 1),
  );
}

function paged(rows: readonly Person[] = people(5)) {
  return createGrid<Person>({
    columnDefs: columns,
    rowData: rows,
    pagination: { enabled: true, pageSize: 2, pageSizeOptions: [2, 10, 25, 50, 100] },
  });
}

describe('pagination', () => {
  it('starts on page 0 and leaves the full displayed list in place', () => {
    const source = people(5);
    const api = paged(source);

    expect(api.getCurrentPage()).toBe(0);
    expect(api.getPageSize()).toBe(2);
    expect(api.getPageCount()).toBe(3);
    expect(api.getPaginatedRowCount()).toBe(2);
    expect(api.getDisplayedRowCount()).toBe(5);
    expect(api.getFilteredRowCount()).toBe(5);
    expect(api.getRowNodeAtPageIndex(0)?.id).toBe('1');
    expect(api.getRowNodeAtPageIndex(1)?.id).toBe('2');
    expect(api.getRowNodeAtPageIndex(2)).toBeUndefined();
    expect(api.getRowNodeAtIndex(2)?.id).toBe('3');
    expect(source.map((row) => row.id)).toEqual([1, 2, 3, 4, 5]);
    expect(api.getGridState().rowData[0]).toBe(source[0]);
  });

  it('moves between pages without paging events when the page does not change', () => {
    const api = paged();
    const events: string[] = [];
    api.addEventListener('paginationChanged', (event) => {
      events.push(`page:${event.pagination.page}:${event.pageCount}`);
    });

    api.nextPage();
    api.nextPage();
    api.nextPage();
    api.previousPage();
    api.firstPage();
    api.firstPage();
    api.lastPage();
    api.lastPage();
    api.setPage(0);
    api.setPage(0);

    expect(events).toEqual([
      'page:1:3',
      'page:2:3',
      'page:1:3',
      'page:0:3',
      'page:2:3',
      'page:0:3',
    ]);
    expect(api.getCurrentPage()).toBe(0);
    expect(api.getRowNodeAtPageIndex(0)?.id).toBe('1');
    expect(api.getRowNodeAtIndex(0)?.id).toBe('1');
    expect(api.getRowNodeAtIndex(4)?.id).toBe('5');
    expect(api.getDisplayedRowCount()).toBe(5);
  });

  it('changes page size and keeps the page inside the new list', () => {
    const api = paged();
    api.setPage(2);
    api.setPageSize(10);

    expect(api.getPageSize()).toBe(10);
    expect(api.getCurrentPage()).toBe(0);
    expect(api.getPageCount()).toBe(1);
    expect(api.getPaginatedRowCount()).toBe(5);
    expect(api.getRowNodeAtPageIndex(4)?.id).toBe('5');
  });

  it('treats an empty filtered set as page 0 with no pages', () => {
    const api = paged([]);
    const events: string[] = [];
    api.addEventListener('paginationChanged', () => {
      events.push('page');
    });

    expect(api.getCurrentPage()).toBe(0);
    expect(api.getPageCount()).toBe(0);
    expect(api.getPaginatedRowCount()).toBe(0);
    expect(api.getRowNodeAtPageIndex(0)).toBeUndefined();
    api.nextPage();
    api.previousPage();
    api.firstPage();
    api.lastPage();
    api.setPage(0);

    expect(events).toEqual([]);
    expect(() => { api.setPage(1); }).toThrow(/no pages/);
    expect(api.getCurrentPage()).toBe(0);
  });

  it('does not emit navigation events for a single page', () => {
    const api = createGrid<Person>({
      columnDefs: columns,
      rowData: people(2),
      pagination: { enabled: true, pageSize: 10 },
    });
    const events: string[] = [];
    api.addEventListener('paginationChanged', () => {
      events.push('page');
    });

    api.nextPage();
    api.previousPage();
    api.firstPage();
    api.lastPage();
    api.setPage(0);

    expect(api.getPageCount()).toBe(1);
    expect(api.getPaginatedRowCount()).toBe(2);
    expect(events).toEqual([]);
    expect(() => { api.setPage(1); }).toThrow(/past the last page/);
  });

  it('moves to the last valid page when a filter removes the current page', () => {
    const api = paged(people(6));
    const events: string[] = [];
    api.setPage(2);
    api.addEventListener('paginationChanged', () => {
      events.push('page');
    });
    api.addEventListener('filterChanged', () => {
      events.push('filter');
    });

    api.setColumnFilter('department', {
      filterType: 'text',
      conditions: [{ type: 'equals', filter: 'Research' }],
    });

    expect(api.getDisplayedRowCount()).toBe(3);
    expect(api.getCurrentPage()).toBe(1);
    expect(api.getPageCount()).toBe(2);
    expect(api.getRowNodeAtPageIndex(0)?.data.department).toBe('Research');
    expect(api.getGridState().sortModel).toEqual([]);
    expect(events).toEqual(['filter', 'page']);
  });

  it('keeps the page while sorting a later page and keeps the filter when sorting is cleared', () => {
    const api = paged(people(5));
    api.setPage(1);
    const events: string[] = [];
    api.addEventListener('paginationChanged', () => {
      events.push('page');
    });
    api.addEventListener('sortChanged', () => {
      events.push('sort');
    });
    api.setSortModel([{ colId: 'salary', sort: 'desc' }]);

    expect(api.getCurrentPage()).toBe(1);
    expect(api.getRowNodeAtPageIndex(0)?.id).toBe('3');
    expect(api.getRowNodeAtIndex(0)?.id).toBe('5');
    expect(events).toEqual(['sort']);

    api.setColumnFilter('department', {
      filterType: 'text',
      conditions: [{ type: 'equals', filter: 'Apps' }],
    });
    api.clearSort();

    expect(api.getFilterModel().filters).toHaveLength(1);
    expect(api.getSortModel()).toEqual([]);
    expect(api.getDisplayedRowCount()).toBe(3);
  });

  it('rejects an invalid page or page size without changing the current page', () => {
    const api = paged();
    api.setPage(1);

    expect(() => { api.setPage(-1); }).toThrow(/integer of 0 or greater/);
    expect(() => { api.setPage(1.5); }).toThrow(/integer of 0 or greater/);
    expect(() => { api.setPage(9); }).toThrow(/past the last page/);
    expect(() => { api.setPageSize(0); }).toThrow(/positive integer/);
    expect(() => { api.setPageSize(7); }).toThrow(/not one of the page size options/);
    expect(api.getCurrentPage()).toBe(1);
    expect(api.getPageSize()).toBe(2);
  });

  it('rejects an initial page that the rows cannot show', () => {
    expect(() =>
      createGrid<Person>({
        columnDefs: columns,
        rowData: people(2),
        pagination: { enabled: true, pageSize: 2, pageSizeOptions: [2, 10], page: 3 },
      }),
    ).toThrow(/past the last page/);
  });

  it('keeps one page while pagination is disabled and still stores a page size', () => {
    const api = createGrid<Person>({ columnDefs: columns, rowData: people(5) });
    const events: string[] = [];
    api.addEventListener('paginationChanged', () => {
      events.push('page');
    });

    expect(api.getCurrentPage()).toBe(0);
    expect(api.getPageCount()).toBe(1);
    expect(api.getPaginatedRowCount()).toBe(5);
    expect(api.getRowNodeAtPageIndex(4)?.id).toBe(api.getRowNodeAtIndex(4)?.id);
    api.nextPage();
    expect(() => { api.setPage(1); }).toThrow(/Pagination is disabled/);
    api.setPageSize(25);

    expect(events).toEqual(['page']);
    expect(api.getPageSize()).toBe(25);
    expect(api.getPaginatedRowCount()).toBe(5);
    expect(api.getDisplayedRowCount()).toBe(5);
  });

  it('saves and restores the page, and an older snapshot restores pagination as disabled', () => {
    const api = paged(people(6));
    api.setPageSize(10);
    api.setPage(0);
    api.setPageSize(2);
    api.setPage(2);
    const restored = restoreGridState<Person>(serializeGridState(api.getGridState()));
    const next = createGrid<Person>({ columnDefs: columns, rowData: [] });
    next.setGridState(restored);

    expect(next.getCurrentPage()).toBe(2);
    expect(next.getPageSize()).toBe(2);
    expect(next.getRowNodeAtPageIndex(0)?.id).toBe('5');

    const legacy = JSON.parse(serializeGridState(api.getGridState())) as {
      state: { pagination?: unknown; configuration: { selectionMode?: string } };
    };
    delete legacy.state.pagination;
    delete legacy.state.configuration.selectionMode;
    const legacyState = restoreGridState<Person>(JSON.stringify(legacy));

    expect(legacyState.pagination).toEqual({
      enabled: false,
      page: 0,
      pageSize: 100,
      pageSizeOptions: [10, 25, 50, 100],
    });
    expect(legacyState.configuration.selectionMode).toBe('multiple');
  });

  it('rejects a restored page that does not fit the restored rows', () => {
    const api = paged(people(2));
    const state = api.getGridState();
    const broken = {
      ...state,
      pagination: { ...state.pagination, page: 4 },
    };

    expect(() => { api.setGridState(broken); }).toThrow(/past the last page/);
    expect(api.getCurrentPage()).toBe(0);
    expect(api.getRowCount()).toBe(2);
  });
});
