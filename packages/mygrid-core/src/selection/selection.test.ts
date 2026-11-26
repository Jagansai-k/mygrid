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

function person(id: number, name: string, department = 'Apps', salary = id * 10): Person {
  return { id, name, department, salary };
}

const rows = [
  person(1, 'Ada', 'Apps', 30),
  person(2, 'Grace', 'Research', 10),
  person(3, 'Lin', 'Apps', 20),
  person(4, 'Kay', 'Research', 40),
];

function grid(mode: 'none' | 'single' | 'multiple' = 'multiple') {
  return createGrid<Person>({
    columnDefs: columns,
    rowData: rows,
    selection: { mode },
    pagination: { enabled: true, pageSize: 2, pageSizeOptions: [2, 10] },
  });
}

describe('row selection', () => {
  it('selects one row in single mode and replaces that row on the next select', () => {
    const api = grid('single');

    api.selectRow('2');
    api.selectRow('2');
    expect(api.getSelectedRowIds()).toEqual(['2']);
    expect(api.isRowSelected('2')).toBe(true);
    api.selectRow('1');

    expect(api.getSelectedRowIds()).toEqual(['1']);
    expect(api.getSelectedRows().map((row) => row.name)).toEqual(['Ada']);
    expect(() => {
      api.setSelectedRowIds(['1', '2']);
    }).toThrow(/one row/);
    expect(api.getSelectedRowIds()).toEqual(['1']);
  });

  it('selects, deselects, and toggles several rows', () => {
    const api = grid();
    const events: string[] = [];
    api.addEventListener('selectionChanged', () => {
      events.push(api.getSelectedRowIds().join(','));
    });

    api.selectRow('1');
    api.selectRow('1');
    api.toggleRowSelection('3');
    api.toggleRowSelection('1');
    api.deselectRow('3');
    api.deselectRow('3');
    api.clearSelection();

    expect(events).toEqual(['1', '1,3', '3', '']);
    expect(api.getSelectedRowIds()).toEqual([]);
    expect(api.isRowSelected('missing')).toBe(false);
  });

  it('rejects selection while it is disabled and still allows a clear', () => {
    const api = grid('none');

    expect(() => {
      api.selectRow('1');
    }).toThrow(/disabled/);
    expect(() => {
      api.selectAllFilteredRows();
    }).toThrow(/disabled/);
    expect(() => {
      api.selectAllSourceRows();
    }).toThrow(/disabled/);
    expect(() => {
      api.setSelectedRowIds(['1']);
    }).toThrow(/disabled/);
    api.clearSelection();
    expect(api.getSelectedRowIds()).toEqual([]);
  });

  it('replaces the selection with every filtered row, including rows on other pages', () => {
    const api = grid();
    api.setPage(1);
    api.selectRow('1');
    api.setColumnFilter('department', {
      filterType: 'text',
      conditions: [{ type: 'equals', filter: 'Research' }],
    });
    api.selectAllFilteredRows();

    expect(api.getCurrentPage()).toBe(0);
    expect(api.getSelectedRowIds()).toEqual(['2', '4']);
    expect(api.isRowSelected('1')).toBe(false);
    expect(api.getPaginatedRowCount()).toBe(2);
    expect(api.getDisplayedRowCount()).toBe(2);
  });

  it('selects every source row, including rows hidden by the filter', () => {
    const api = grid();
    api.setColumnFilter('department', {
      filterType: 'text',
      conditions: [{ type: 'equals', filter: 'Apps' }],
    });
    api.selectAllSourceRows();
    api.selectAllSourceRows();

    expect(api.getSelectedRowIds()).toEqual(['1', '2', '3', '4']);
    expect(api.getDisplayedRowCount()).toBe(2);
  });

  it('keeps selection across pages, sorting, and filtering, and drops a removed id', () => {
    const api = grid();
    api.selectRow('4');
    api.setPage(1);
    api.setSortModel([{ colId: 'salary', sort: 'asc' }]);
    api.setColumnFilter('department', {
      filterType: 'text',
      conditions: [{ type: 'equals', filter: 'Apps' }],
    });

    expect(api.isRowSelected('4')).toBe(true);
    expect(api.getRowNode('4')).toBeUndefined();
    api.clearAllFilters();
    expect(api.getSortModel()).toEqual([{ colId: 'salary', sort: 'asc', sortIndex: 0 }]);
    expect(api.isRowSelected('4')).toBe(true);
    expect(api.getRowNode('4')?.data.name).toBe('Kay');

    const replaced = person(4, 'Kay Two', 'Research', 40);
    api.replaceRow('4', replaced);
    expect(api.isRowSelected('4')).toBe(true);
    expect(api.getSelectedRows()[0]).toBe(replaced);

    api.removeRows(['4']);
    expect(api.getSelectedRowIds()).toEqual([]);
    expect(api.getSortModel()).toHaveLength(1);
  });

  it('rejects an unknown row id and leaves the previous selection in place', () => {
    const api = grid();
    api.selectRow('1');

    expect(() => {
      api.selectRow('missing');
    }).toThrow(/does not exist/);
    expect(() => {
      api.deselectRow('missing');
    }).toThrow(/does not exist/);
    expect(() => {
      api.toggleRowSelection('');
    }).toThrow(/non-empty string/);
    expect(api.getSelectedRowIds()).toEqual(['1']);
  });

  it('saves and restores selected ids and skips a repeated selection event', () => {
    const api = grid();
    const events: string[] = [];
    api.addEventListener('selectionChanged', () => {
      events.push('selection');
    });
    api.setSelectedRowIds(['3', '1']);
    api.setSelectedRowIds(['3', '1']);
    const restored = restoreGridState<Person>(serializeGridState(api.getGridState()));
    const next = createGrid<Person>({ columnDefs: columns, rowData: [] });
    next.setGridState(restored);

    expect(next.getSelectedRowIds()).toEqual(['3', '1']);
    expect(next.getGridState().configuration.selectionMode).toBe('multiple');
    expect(events).toEqual(['selection']);
  });

  it('filters, sorts, pages, and selects one pipeline without losing the other models', () => {
    const source = [...rows];
    const api = grid();
    api.setSortModel([{ colId: 'salary', sort: 'asc' }]);
    api.setColumnFilter('department', {
      filterType: 'text',
      conditions: [{ type: 'equals', filter: 'Research' }],
    });
    api.lastPage();
    api.selectAllFilteredRows();
    api.setPage(0);

    expect(api.getGridState().displayedRowIds).toEqual(['2', '4']);
    expect(api.getSelectedRowIds()).toEqual(['2', '4']);
    expect(api.getCurrentPage()).toBe(0);
    expect(api.getRowNodeAtPageIndex(0)?.id).toBe('2');
    expect(api.getRowNodeAtIndex(1)?.id).toBe('4');
    expect(source.map((row) => row.name)).toEqual(['Ada', 'Grace', 'Lin', 'Kay']);

    api.clearAllFilters();
    expect(api.getSortModel()).toEqual([{ colId: 'salary', sort: 'asc', sortIndex: 0 }]);
    expect(api.getSelectedRowIds()).toEqual(['2', '4']);
    expect(api.getDisplayedRowCount()).toBe(4);
    api.clearSort();
    expect(api.getSelectedRowIds()).toEqual(['2', '4']);
    expect(api.getFilterModel().filters).toEqual([]);
    expect(api.getGridState().rowIds).toEqual(['1', '2', '3', '4']);
  });
});
