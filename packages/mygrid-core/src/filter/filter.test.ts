import { describe, expect, it } from 'vitest';
import { createGrid } from '../grid/create-grid';
import { restoreGridState, serializeGridState } from '../persistence/serialize';
import type { ColumnDefinition, ColumnFilterPredicate, FilterPredicateParams } from '../types';

interface Person {
  id: number;
  name: string | null;
  department: string | null;
  salary: number | null;
  hired?: Date | string | null;
  active?: boolean | null;
  tag?: string | number | boolean | null;
}

function person(
  id: number,
  name: string | null,
  department: string | null = 'Engineering',
  salary: number | null = 100,
  extra: Partial<Person> = {},
): Person {
  return { id, name, department, salary, ...extra };
}

const columns: ColumnDefinition<Person>[] = [
  { field: 'name', filterable: true, sortable: true },
  { field: 'department', filterable: true, sortable: true },
  { field: 'salary', filterable: true, sortable: true },
  { field: 'hired', filterable: true, sortable: true },
  { field: 'active', filterable: true },
  { field: 'tag', filterable: true },
];

function grid(rows: readonly Person[], defs: readonly ColumnDefinition<Person>[] = columns) {
  return createGrid<Person>({ columnDefs: defs, rowData: rows });
}

function ids(api: ReturnType<typeof grid>): string[] {
  return api.getGridState().displayedRowIds.slice();
}

function text(
  type: 'contains' | 'notContains' | 'equals' | 'notEqual' | 'startsWith' | 'endsWith',
  filter: string,
) {
  return {
    filterType: 'text' as const,
    conditions: [{ type, filter }],
  };
}

describe('filtering', () => {
  it('matches every text operator and keeps the source array unchanged', () => {
    const rows = [
      person(1, 'Ada'),
      person(2, 'Adam'),
      person(3, 'Grace'),
      person(4, ''),
      person(5, null),
    ];
    const api = grid(rows);

    api.setColumnFilter('name', text('contains', 'Ada'));
    expect(ids(api)).toEqual(['1', '2']);
    api.setColumnFilter('name', text('notContains', 'Ada'));
    expect(ids(api)).toEqual(['3', '4', '5']);
    api.setColumnFilter('name', text('equals', 'Ada'));
    expect(ids(api)).toEqual(['1']);
    api.setColumnFilter('name', text('notEqual', 'Ada'));
    expect(ids(api)).toEqual(['2', '3', '4', '5']);
    api.setColumnFilter('name', text('startsWith', 'Ada'));
    expect(ids(api)).toEqual(['1', '2']);
    api.setColumnFilter('name', text('endsWith', 'ace'));
    expect(ids(api)).toEqual(['3']);

    expect(rows.map((row) => row.id)).toEqual([1, 2, 3, 4, 5]);
    expect(api.getGridState().rowData.map((row) => row.name)).toEqual([
      'Ada',
      'Adam',
      'Grace',
      '',
      null,
    ]);
    expect(api.getRowCount()).toBe(5);
    expect(api.getFilteredRowCount()).toBe(1);
    expect(api.getDisplayedRowCount()).toBe(1);
  });

  it('matches every number operator and rejects values that are not finite numbers', () => {
    const api = grid([
      person(1, 'Ada', 'Engineering', 10),
      person(2, 'Bea', 'Engineering', 20),
      person(3, 'Cy', 'Engineering', null),
      person(4, 'Dee', 'Engineering', Number.NaN),
    ]);

    api.setColumnFilter('salary', {
      filterType: 'number',
      conditions: [{ type: 'equals', filter: 10 }],
    });
    expect(ids(api)).toEqual(['1']);
    api.setColumnFilter('salary', {
      filterType: 'number',
      conditions: [{ type: 'notEqual', filter: 10 }],
    });
    expect(ids(api)).toEqual(['2']);
    api.setColumnFilter('salary', {
      filterType: 'number',
      conditions: [{ type: 'greaterThan', filter: 10 }],
    });
    expect(ids(api)).toEqual(['2']);
    api.setColumnFilter('salary', {
      filterType: 'number',
      conditions: [{ type: 'greaterThanOrEqual', filter: 10 }],
    });
    expect(ids(api)).toEqual(['1', '2']);
    api.setColumnFilter('salary', {
      filterType: 'number',
      conditions: [{ type: 'lessThan', filter: 20 }],
    });
    expect(ids(api)).toEqual(['1']);
    api.setColumnFilter('salary', {
      filterType: 'number',
      conditions: [{ type: 'lessThanOrEqual', filter: 10 }],
    });
    expect(ids(api)).toEqual(['1']);
    api.setColumnFilter('salary', {
      filterType: 'number',
      conditions: [{ type: 'inRange', filter: 10, filterTo: 20 }],
    });
    expect(ids(api)).toEqual(['1', '2']);
  });

  it('matches every date operator on UTC days and ignores invalid dates', () => {
    const early = new Date('2019-01-01T00:00:00.000Z');
    const mid = new Date('2020-06-15T18:00:00.000Z');
    const late = new Date('2021-01-01T00:00:00.000Z');
    const api = grid([
      person(1, 'Ada', 'Engineering', 10, { hired: early }),
      person(2, 'Bea', 'Engineering', 10, { hired: mid }),
      person(3, 'Cy', 'Engineering', 10, { hired: late }),
      person(4, 'Dee', 'Engineering', 10, { hired: new Date(Number.NaN) }),
      person(5, 'Eve', 'Engineering', 10, { hired: null }),
      person(6, 'Fay', 'Engineering', 10, { hired: '2020-06-15' }),
    ]);

    api.setColumnFilter('hired', {
      filterType: 'date',
      conditions: [{ type: 'equals', dateFrom: '2020-06-15' }],
    });
    expect(ids(api)).toEqual(['2', '6']);
    api.setColumnFilter('hired', {
      filterType: 'date',
      conditions: [{ type: 'before', dateFrom: '2020-06-15' }],
    });
    expect(ids(api)).toEqual(['1']);
    api.setColumnFilter('hired', {
      filterType: 'date',
      conditions: [{ type: 'after', dateFrom: '2020-06-15' }],
    });
    expect(ids(api)).toEqual(['3']);
    api.setColumnFilter('hired', {
      filterType: 'date',
      conditions: [{ type: 'inRange', dateFrom: '2019-01-01', dateTo: '2020-06-15' }],
    });
    expect(ids(api)).toEqual(['1', '2', '6']);
  });

  it('matches set values, treats an empty selection as no rows, and matches blanks only through null', () => {
    const api = grid([
      person(1, 'Ada', 'Engineering', 10, { tag: 'gold' }),
      person(2, 'Bea', 'Research', 10, { tag: 2 }),
      person(3, 'Cy', null, 10, { tag: true }),
      person(4, 'Dee', 'Engineering', 10),
    ]);

    api.setColumnFilter('tag', { filterType: 'set', values: ['gold', 2, true] });
    expect(ids(api)).toEqual(['1', '2', '3']);
    api.setColumnFilter('department', { filterType: 'set', values: [null] });
    expect(ids(api)).toEqual(['3']);
    api.setColumnFilter('tag', { filterType: 'set', values: [] });
    expect(ids(api)).toEqual([]);
    expect(api.getFilterModel().filters.find((item) => item.colId === 'tag')?.filter).toEqual({
      filterType: 'set',
      values: [],
    });
  });

  it('combines column filters with and or or, and conditions inside one column', () => {
    const rows = [
      person(1, 'Ada', 'Engineering', 10),
      person(2, 'Adam', 'Research', 30),
      person(3, 'Grace', 'Engineering', 30),
    ];
    const api = grid(rows);

    api.setFilterModel({
      filters: [
        { colId: 'department', filter: text('equals', 'Engineering') },
        {
          colId: 'salary',
          filter: { filterType: 'number', conditions: [{ type: 'greaterThan', filter: 20 }] },
        },
      ],
    });
    expect(ids(api)).toEqual(['3']);

    api.setFilterModel({
      join: 'or',
      filters: [
        { colId: 'department', filter: text('equals', 'Research') },
        { colId: 'name', filter: text('equals', 'Grace') },
      ],
    });
    expect(ids(api)).toEqual(['2', '3']);
    expect(api.getFilterModel().join).toBe('or');

    api.setColumnFilter('name', {
      filterType: 'text',
      operator: 'and',
      conditions: [
        { type: 'startsWith', filter: 'Ada' },
        { type: 'equals', filter: 'Ada' },
      ],
    });
    api.clearColumnFilter('department');
    expect(ids(api)).toEqual(['1']);

    api.setColumnFilter('name', {
      filterType: 'text',
      operator: 'or',
      conditions: [
        { type: 'equals', filter: 'Ada' },
        { type: 'equals', filter: 'Grace' },
      ],
    });
    expect(ids(api)).toEqual(['1', '3']);
  });

  it('uses a custom predicate and can ignore case from the grid or one text filter', () => {
    const predicate = ({ value }: FilterPredicateParams<Person>): boolean =>
      typeof value === 'string' && value.length > 3;
    const api = grid(
      [person(1, 'Ada'), person(2, 'Grace')],
      [{ field: 'name', filterable: true, filter: predicate }],
    );
    api.setColumnFilter('name', { filterType: 'custom' });
    expect(ids(api)).toEqual(['2']);
    expect(api.getColumn('name')?.filter).toBe(predicate);

    const sensitive = grid([person(1, 'Ada'), person(2, 'ada')]);
    sensitive.setColumnFilter('name', text('equals', 'ada'));
    expect(ids(sensitive)).toEqual(['2']);
    sensitive.setColumnFilter('name', {
      filterType: 'text',
      caseSensitive: false,
      conditions: [{ type: 'equals', filter: 'ADA' }],
    });
    expect(ids(sensitive)).toEqual(['1', '2']);

    const insensitive = createGrid<Person>({
      columnDefs: columns,
      rowData: [person(1, 'Ada'), person(2, 'Bea')],
      filtering: { caseSensitive: false },
    });
    insensitive.setColumnFilter('name', text('equals', 'ada'));
    expect(ids(insensitive)).toEqual(['1']);
    expect(insensitive.getGridState().configuration.filterCaseSensitive).toBe(false);
  });

  it('treats null, undefined, and a missing field as blank, and filters an empty grid', () => {
    const api = grid([person(1, 'Ada')], [{ field: 'nickname' as 'name', filterable: true }]);
    api.setColumnFilter('nickname', text('equals', 'Ada'));
    expect(ids(api)).toEqual([]);
    api.setColumnFilter('nickname', text('notEqual', 'Ada'));
    expect(ids(api)).toEqual(['1']);

    const empty = grid([]);
    empty.setFilterModel({ filters: [{ colId: 'name', filter: text('contains', 'A') }] });
    expect(empty.getFilteredRowCount()).toBe(0);
    empty.clearAllFilters();
    expect(empty.getFilterModel()).toEqual({ join: 'and', filters: [] });
  });

  it('filters before sorting and keeps each model when the other is cleared', () => {
    const rows = [
      person(1, 'Grace', 'Research', 5),
      person(2, 'Ada', 'Engineering', 20),
      person(3, 'Bea', 'Engineering', 10),
    ];
    const api = grid(rows);
    api.setSortModel([{ colId: 'salary', sort: 'asc' }]);
    api.setColumnFilter('department', text('equals', 'Engineering'));

    expect(ids(api)).toEqual(['3', '2']);
    expect(api.getGridState().rowIds).toEqual(['1', '2', '3']);
    expect(rows.map((row) => row.id)).toEqual([1, 2, 3]);

    api.clearAllFilters();
    expect(api.getSortModel()).toEqual([{ colId: 'salary', sort: 'asc', sortIndex: 0 }]);
    expect(ids(api)).toEqual(['1', '3', '2']);

    api.setColumnFilter('department', text('equals', 'Engineering'));
    api.clearSort();
    expect(api.getFilterModel().filters).toHaveLength(1);
    expect(ids(api)).toEqual(['2', '3']);
  });

  it('recomputes the displayed rows when rows are added, removed, or updated', () => {
    const api = grid([person(1, 'Grace', 'Research', 30), person(2, 'Ada', 'Engineering', 10)]);
    api.setSortModel([{ colId: 'salary', sort: 'desc' }]);
    api.setColumnFilter('department', text('equals', 'Engineering'));

    api.insertRows(0, [person(3, 'Bea', 'Engineering', 50), person(4, 'Cy', 'Research', 1)]);
    expect(api.getGridState().rowIds).toEqual(['3', '4', '1', '2']);
    expect(ids(api)).toEqual(['3', '2']);

    api.replaceRow('2', person(2, 'Ada', 'Research', 10));
    expect(ids(api)).toEqual(['3']);
    api.replaceRow('1', person(1, 'Grace', 'Engineering', 40));
    expect(ids(api)).toEqual(['3', '1']);

    api.removeRows(['3']);
    expect(ids(api)).toEqual(['1']);
    expect(api.getRowNode('4')).toBeUndefined();
    expect(api.getGridState().rowIds).toContain('4');
  });

  it('clears focus for a filtered row and keeps its selection', () => {
    const api = grid([person(1, 'Ada', 'Engineering'), person(2, 'Bea', 'Research')]);
    api.setSelectedRowIds(['2', '1']);
    api.setFocusedCell({ rowIndex: 1, columnId: 'name' });
    api.setColumnFilter('department', text('equals', 'Engineering'));

    expect(api.getFocusedCell()).toBeNull();
    expect(api.getSelectedRowIds()).toEqual(['2', '1']);
    expect(api.getSelectedRows().map((row) => row.name)).toEqual(['Bea', 'Ada']);
    expect(api.getRowNode('2')).toBeUndefined();

    api.clearAllFilters();
    expect(api.getFocusedCell()).toBeNull();
    expect(api.getSelectedRowIds()).toEqual(['2', '1']);
    expect(api.getRowNodeAtIndex(1)?.id).toBe('2');
  });

  it('restores a filter model and keeps a custom predicate that the snapshot cannot store', () => {
    const api = grid([person(1, 'Grace', 'Research', 5), person(2, 'Ada', 'Engineering', 20)]);
    api.setFilterModel({
      filters: [{ colId: 'department', filter: text('equals', 'Engineering') }],
    });
    api.setSortModel([{ colId: 'name', sort: 'asc' }]);

    const restored = restoreGridState<Person>(serializeGridState(api.getGridState()));
    expect(restored.filterModel).toEqual({
      join: 'and',
      filters: [
        {
          colId: 'department',
          filter: {
            filterType: 'text',
            operator: 'and',
            caseSensitive: null,
            conditions: [{ type: 'equals', filter: 'Engineering' }],
          },
        },
      ],
    });
    expect(restored.displayedRowIds).toEqual(['2']);
    expect(restored.rowIds).toEqual(['1', '2']);

    const next = grid([]);
    next.setGridState(restored);
    expect(next.getRowNodeAtIndex(0)?.data.name).toBe('Ada');
    expect(next.getGridState().rowData.map((row) => row.name)).toEqual(['Grace', 'Ada']);

    const plain = grid([person(1, 'Grace', 'Research', 5), person(2, 'Ada', 'Engineering', 20)]);
    const legacy = JSON.parse(serializeGridState(plain.getGridState())) as {
      state: { filterModel?: unknown; configuration: { filterCaseSensitive?: boolean } };
    };
    delete legacy.state.filterModel;
    delete legacy.state.configuration.filterCaseSensitive;
    const legacyState = restoreGridState<Person>(JSON.stringify(legacy));
    expect(legacyState.filterModel).toEqual({ join: 'and', filters: [] });
    expect(legacyState.configuration.filterCaseSensitive).toBe(true);

    const predicate = ({ value }: FilterPredicateParams<Person>): boolean => value === 'Ed';
    const custom = createGrid<Person>({
      columnDefs: [{ field: 'name', filterable: true, filter: predicate }],
      rowData: [person(1, 'Ann'), person(2, 'Ed')],
    });
    custom.setColumnFilter('name', { filterType: 'custom' });
    const snapshot = custom.getGridState();
    custom.setGridState(snapshot);
    expect(custom.getColumn('name')?.filter).toBe(predicate);
    expect(ids(custom)).toEqual(['2']);

    const withoutPredicate = grid(
      [person(1, 'Ann'), person(2, 'Ed')],
      [{ field: 'name', filterable: true }],
    );
    expect(() => {
      withoutPredicate.setGridState(snapshot);
    }).toThrow(/no filter function/);
    expect(withoutPredicate.getFilterModel().filters).toEqual([]);
    expect(withoutPredicate.getRowNodeAtIndex(0)?.data.name).toBe('Ann');
  });

  it('emits filterChanged once for a changed model and not when rows or sorting change', () => {
    const api = grid([person(1, 'Ada', 'Engineering', 10), person(2, 'Bea', 'Research', 20)]);
    const events: string[] = [];
    api.addEventListener('filterChanged', (event) => {
      events.push(`filter:${event.displayedRowIds.join(',')}`);
    });
    api.addEventListener('sortChanged', () => {
      events.push('sort');
    });
    api.addEventListener('rowDataChanged', () => {
      events.push('rows');
    });

    const model = {
      filters: [{ colId: 'department', filter: text('equals', 'Engineering') }],
    };
    api.setFilterModel(model);
    api.setFilterModel(model);
    api.clearAllFilters();
    api.clearAllFilters();
    api.setColumnFilter('department', text('equals', 'Research'));
    api.setSortModel([{ colId: 'salary', sort: 'asc' }]);
    api.insertRows(2, [person(3, 'Cy', 'Research', 5)]);
    api.applyFilters();
    api.applyFilters();

    expect(events).toEqual(['filter:1', 'filter:1,2', 'filter:2', 'sort', 'rows']);
    expect(ids(api)).toEqual(['3', '2']);
  });

  it('reapplies a filter after an in-place edit and leaves an invalid model unchanged', () => {
    const first = person(1, 'Ada', 'Engineering', 10);
    const api = grid([first, person(2, 'Bea', 'Research', 20)]);
    api.setColumnFilter('department', text('equals', 'Engineering'));
    first.department = 'Research';
    api.applyFilters();
    expect(ids(api)).toEqual([]);
    expect(api.getGridState().rowData[0]).toBe(first);

    expect(() => {
      api.setColumnFilter('missing', text('equals', 'Ada'));
    }).toThrow(/Unknown filter/);
    expect(() => {
      api.setFilterModel({
        filters: [
          { colId: 'name', filter: text('equals', 'Ada') },
          { colId: 'name', filter: text('equals', 'Bea') },
        ],
      });
    }).toThrow(/Duplicate filter/);
    expect(() => {
      api.setColumnFilter('name', {
        filterType: 'number',
        conditions: [{ type: 'inRange', filter: 5, filterTo: 1 }],
      });
    }).toThrow(/cannot be greater/);
    expect(() => {
      api.setColumnFilter('hired', {
        filterType: 'date',
        conditions: [{ type: 'equals', dateFrom: '2020-13-01' }],
      });
    }).toThrow(/YYYY-MM-DD/);
    expect(() => {
      api.setColumnFilter('name', { filterType: 'text', conditions: [] });
    }).toThrow(/conditions/);
    expect(() => {
      api.setColumnFilter('name', { filterType: 'custom' });
    }).toThrow(/no filter function/);

    const broken = grid(
      [person(1, 'Ada'), person(2, 'Bea')],
      [
        {
          field: 'name',
          filterable: true,
          filter: (() => 1) as unknown as ColumnFilterPredicate<Person>,
        },
      ],
    );
    expect(() => {
      broken.setColumnFilter('name', { filterType: 'custom' });
    }).toThrow(/boolean/);
    expect(broken.getFilterModel().filters).toEqual([]);
    expect(ids(broken)).toEqual(['1', '2']);
    expect(api.getFilterModel().filters[0]?.colId).toBe('department');
  });
});
