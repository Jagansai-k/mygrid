import { describe, expect, it } from 'vitest';
import { createGrid } from '../grid/create-grid';
import { restoreGridState, serializeGridState } from '../persistence/serialize';
import type { ColumnDefinition, SortComparatorParams } from '../types';

interface Employee {
  id: number;
  name: string;
  department: string;
  salary: number;
  active?: boolean;
  hired?: Date;
  nickname?: string;
}

function employee(
  id: number,
  name: string,
  department = 'Engineering',
  salary = 100,
  extra: Partial<Employee> = {},
): Employee {
  return { id, name, department, salary, ...extra };
}

const columns: ColumnDefinition<Employee>[] = [
  { field: 'name', headerName: 'Name', sortable: true },
  { field: 'department', headerName: 'Department', sortable: true },
  { field: 'salary', headerName: 'Salary', sortable: true },
];

function grid(rows: readonly Employee[], defs: readonly ColumnDefinition<Employee>[] = columns) {
  return createGrid<Employee>({ columnDefs: defs, rowData: rows });
}

describe('sorting', () => {
  it('sorts ascending and descending by a field without mutating the source array', () => {
    const grace = employee(2, 'Grace', 'Research', 80);
    const ada = employee(1, 'Ada', 'Engineering', 120);
    const rows = [grace, ada];

    const api = grid(rows);
    expect(api.getRowNodeAtIndex(0)?.data.name).toBe('Grace');

    api.sortColumn('name', 'asc');
    expect(api.getSortModel()).toEqual([{ colId: 'name', sort: 'asc', sortIndex: 0 }]);
    expect(api.getRowNodeAtIndex(0)?.data).toBe(ada);
    expect(api.getRowNodeAtIndex(1)?.data).toBe(grace);
    expect(api.getGridState().rowData.map((row) => row.name)).toEqual(['Grace', 'Ada']);
    expect(api.getGridState().displayedRowIds).toEqual(['1', '2']);
    expect(rows.map((row) => row.id)).toEqual([2, 1]);
    expect(api.getDisplayedRowCount()).toBe(2);

    api.sortColumn('salary', 'desc');
    expect(api.getRowNodeAtIndex(0)?.data.name).toBe('Ada');
    expect(api.getRowNodeAtIndex(1)?.data.name).toBe('Grace');
    expect(api.getSortModel()).toEqual([{ colId: 'salary', sort: 'desc', sortIndex: 0 }]);
  });

  it('sorts several columns and keeps source order when every key is equal', () => {
    const api = grid([
      employee(1, 'Ada', 'Platform', 90),
      employee(2, 'Ada', 'Platform', 90),
      employee(3, 'Ada', 'Apps', 90),
      employee(4, 'Grace', 'Platform', 90),
    ]);

    api.setSortModel([
      { colId: 'name', sort: 'asc' },
      { colId: 'department', sort: 'asc' },
      { colId: 'salary', sort: 'asc' },
    ]);

    expect(api.getRowNodeAtIndex(0)?.id).toBe('3');
    expect(api.getRowNodeAtIndex(1)?.id).toBe('1');
    expect(api.getRowNodeAtIndex(2)?.id).toBe('2');
    expect(api.getRowNodeAtIndex(3)?.id).toBe('4');
    expect(api.getSortModel().map((item) => item.sortIndex)).toEqual([0, 1, 2]);
    expect(api.getGridState().rowIds).toEqual(['1', '2', '3', '4']);
  });

  it('sorts numbers, strings, booleans, dates, nulls, and missing fields', () => {
    const early = new Date('2019-01-01T00:00:00.000Z');
    const later = new Date('2021-06-01T00:00:00.000Z');
    const invalid = new Date(Number.NaN);
    const api = grid(
      [
        employee(1, 'b', 'Engineering', 10, { active: true, hired: later, nickname: 'Z' }),
        employee(2, 'A', 'Engineering', Number.NaN, { active: false, hired: invalid }),
        employee(3, 'a', 'Engineering', 2, { hired: early, nickname: 'M' }),
        employee(4, 'B', 'Engineering', 2),
      ],
      [
        { field: 'salary', sortable: true },
        { field: 'name', sortable: true },
        { field: 'active', sortable: true },
        { field: 'hired', sortable: true },
        { field: 'nickname', sortable: true },
      ],
    );

    api.sortColumn('salary', 'asc');
    expect(api.getGridState().displayedRowIds).toEqual(['3', '4', '1', '2']);

    api.sortColumn('salary', 'desc');
    expect(api.getGridState().displayedRowIds).toEqual(['1', '3', '4', '2']);

    api.sortColumn('name', 'asc');
    expect(api.getGridState().displayedRowIds).toEqual(['2', '4', '3', '1']);

    api.sortColumn('active', 'asc');
    expect(api.getRowNodeAtIndex(0)?.id).toBe('2');
    expect(api.getRowNodeAtIndex(1)?.id).toBe('1');

    api.sortColumn('hired', 'asc');
    expect(api.getGridState().displayedRowIds).toEqual(['3', '1', '2', '4']);

    api.sortColumn('nickname', 'asc');
    expect(api.getGridState().displayedRowIds).toEqual(['3', '1', '2', '4']);
  });

  it('can ignore string case from the grid or from one column', () => {
    const rows = [employee(1, 'B'), employee(2, 'a')];
    const sensitive = grid(rows);
    sensitive.sortColumn('name', 'asc');
    expect(sensitive.getGridState().displayedRowIds).toEqual(['1', '2']);

    const insensitive = createGrid<Employee>({
      columnDefs: columns,
      rowData: rows,
      sorting: { caseSensitive: false },
    });
    insensitive.sortColumn('name', 'asc');
    expect(insensitive.getGridState().displayedRowIds).toEqual(['2', '1']);
    expect(insensitive.getGridState().configuration.caseSensitive).toBe(false);

    const mixed = createGrid<Employee>({
      columnDefs: [
        { field: 'name', sortable: true, caseSensitive: false },
        { field: 'department', sortable: true, caseSensitive: true },
      ],
      rowData: [employee(1, 'B', 'B'), employee(2, 'a', 'a')],
      sorting: { caseSensitive: true },
    });
    mixed.sortColumn('department', 'asc');
    expect(mixed.getGridState().displayedRowIds).toEqual(['1', '2']);
    mixed.sortColumn('name', 'asc');
    expect(mixed.getGridState().displayedRowIds).toEqual(['2', '1']);
  });

  it('uses a custom comparator and rejects a non-finite result', () => {
    const api = grid(
      [employee(1, 'Ada', 'Engineering', 10), employee(2, 'Grace', 'Research', 50)],
      [
        {
          field: 'salary',
          sortable: true,
          comparator: ({ valueA, valueB }: SortComparatorParams<Employee>) =>
            Number(valueB) - Number(valueA),
        },
      ],
    );

    api.sortColumn('salary', 'asc');
    expect(api.getRowNodeAtIndex(0)?.data.salary).toBe(50);
    api.sortColumn('salary', 'desc');
    expect(api.getRowNodeAtIndex(0)?.data.salary).toBe(10);

    const broken = grid(
      [employee(1, 'Ada'), employee(2, 'Grace')],
      [
        {
          field: 'name',
          sortable: true,
          comparator: () => Number.NaN,
        },
      ],
    );
    expect(() => {
      broken.sortColumn('name', 'asc');
    }).toThrow(/finite number/);
    expect(broken.getSortModel()).toEqual([]);
    expect(broken.getRowNodeAtIndex(0)?.id).toBe('1');
  });

  it('sorts an empty grid, leaves missing comparators in source order, and clears back to it', () => {
    const empty = grid([]);
    empty.setSortModel([{ colId: 'name', sort: 'desc' }]);
    expect(empty.getRowCount()).toBe(0);
    expect(empty.getSortModel()).toEqual([{ colId: 'name', sort: 'desc', sortIndex: 0 }]);
    empty.applySorting();
    empty.clearSort();
    expect(empty.getSortModel()).toEqual([]);

    const api = grid(
      [employee(1, 'Grace'), employee(2, 'Ada')],
      [
        { colId: 'label', sortable: true },
        { field: 'name', sortable: true },
      ],
    );
    api.sortColumn('label', 'asc');
    expect(api.getGridState().displayedRowIds).toEqual(['1', '2']);
    api.clearSort();
    expect(api.getRowNodeAtIndex(0)?.id).toBe('1');
  });

  it('toggles one column or several and applies an initial sort from new columns', () => {
    const api = grid([employee(1, 'Grace'), employee(2, 'Ada')]);

    api.toggleSort('name');
    expect(api.getSortModel()).toEqual([{ colId: 'name', sort: 'asc', sortIndex: 0 }]);
    api.toggleSort('department', true);
    expect(api.getSortModel()).toEqual([
      { colId: 'name', sort: 'asc', sortIndex: 0 },
      { colId: 'department', sort: 'asc', sortIndex: 1 },
    ]);
    api.toggleSort('name', true);
    api.toggleSort('name', true);
    expect(api.getSortModel()).toEqual([{ colId: 'department', sort: 'asc', sortIndex: 0 }]);

    api.sortColumn('name', 'desc', true);
    api.sortColumn('department', null, true);
    expect(api.getSortModel()).toEqual([{ colId: 'name', sort: 'desc', sortIndex: 0 }]);

    api.setColumnDefs([
      ...columns,
      { field: 'active', sortable: true, sort: 'asc', sortingOrder: ['desc', 'asc'] },
    ]);
    expect(api.getSortModel()).toEqual([
      { colId: 'name', sort: 'desc', sortIndex: 0 },
      { colId: 'active', sort: 'asc', sortIndex: 1 },
    ]);
    api.toggleSort('active', true);
    expect(api.getSortModel()[1]).toEqual({ colId: 'active', sort: 'desc', sortIndex: 1 });
  });

  it('keeps the source index for inserts and reapplies the current sort', () => {
    const api = grid([employee(1, 'Grace', 'Engineering', 20), employee(2, 'Ada', 'Research', 50)]);
    api.sortColumn('salary', 'asc');
    api.insertRows(0, [employee(3, 'Lin', 'Engineering', 5)]);

    expect(api.getGridState().rowIds).toEqual(['3', '1', '2']);
    expect(api.getGridState().displayedRowIds).toEqual(['3', '1', '2']);
    api.sortColumn('name', 'asc');
    api.insertRows(0, [employee(4, 'Zoe', 'Engineering', 1)]);
    expect(api.getGridState().rowIds[0]).toBe('4');
    expect(api.getRowNodeAtIndex(0)?.data.name).toBe('Ada');
    expect(api.getRowNode('4')?.data).toMatchObject({ name: 'Zoe' });
  });

  it('moves focus with the displayed index and does not notify when the model is unchanged', () => {
    const api = grid([employee(1, 'Grace'), employee(2, 'Ada')]);
    const events: string[] = [];
    api.addEventListener('sortChanged', (event) => {
      events.push(`sort:${event.sortModel.map((item) => item.colId).join(',')}`);
    });
    api.addEventListener('rowDataChanged', () => {
      events.push('rows');
    });
    api.addEventListener('cellFocused', (event) => {
      events.push(`focus:${event.cell?.rowId ?? 'none'}:${event.cell?.rowIndex ?? 'none'}`);
    });
    api.addEventListener('stateChanged', (event) => {
      events.push(`state:${event.changes.join('+')}`);
    });

    api.setFocusedCell({ rowIndex: 0, columnId: 'name' });
    api.setSortModel([{ colId: 'name', sort: 'asc' }]);
    api.setSortModel([{ colId: 'name', sort: 'asc' }]);
    api.clearSort();
    api.clearSort();

    expect(api.getFocusedCell()).toEqual({ rowIndex: 0, rowId: '1', columnId: 'name' });
    expect(events).toEqual([
      'focus:1:0',
      'state:focusedCell',
      'sort:name',
      'focus:1:1',
      'state:displayedRowIds+sortModel+focusedCell',
      'sort:',
      'focus:1:0',
      'state:displayedRowIds+sortModel+focusedCell',
    ]);
  });

  it('re-sorts mutated row objects only when applySorting sees a new order', () => {
    const first = employee(1, 'Ada', 'Engineering', 30);
    const second = employee(2, 'Grace', 'Research', 10);
    const api = grid([first, second]);
    api.sortColumn('salary', 'asc');
    expect(api.getRowNodeAtIndex(0)?.id).toBe('2');

    first.salary = 1;
    let sorts = 0;
    let rows = 0;
    api.addEventListener('sortChanged', () => {
      sorts += 1;
    });
    api.addEventListener('rowDataChanged', () => {
      rows += 1;
    });
    api.applySorting();
    api.applySorting();

    expect(api.getRowNodeAtIndex(0)?.id).toBe('1');
    expect(sorts).toBe(1);
    expect(rows).toBe(0);
    expect(api.getGridState().rowIds).toEqual(['1', '2']);
  });

  it('restores the sort model and displayed order', () => {
    const api = grid([employee(1, 'Grace', 'Engineering', 10), employee(2, 'Ada', 'Research', 40)]);
    api.setSortModel([
      { colId: 'department', sort: 'desc' },
      { colId: 'salary', sort: 'asc' },
    ]);
    api.setFocusedCell({ rowIndex: 0, columnId: 'name' });

    const restored = restoreGridState<Employee>(serializeGridState(api.getGridState()));
    expect(restored.sortModel).toEqual([
      { colId: 'department', sort: 'desc', sortIndex: 0 },
      { colId: 'salary', sort: 'asc', sortIndex: 1 },
    ]);
    expect(restored.rowIds).toEqual(['1', '2']);
    expect(restored.displayedRowIds).toEqual(['2', '1']);

    const next = grid([]);
    next.setGridState(restored);
    expect(next.getSortModel()).toEqual(restored.sortModel);
    expect(next.getRowNodeAtIndex(0)?.data.name).toBe('Ada');
    expect(next.getGridState().rowData.map((row) => row.name)).toEqual(['Grace', 'Ada']);
    expect(next.getFocusedCell()).toEqual({ rowIndex: 0, rowId: '2', columnId: 'name' });

    const same = grid([employee(1, 'Grace'), employee(2, 'Ada')]);
    const events: string[] = [];
    same.addEventListener('stateChanged', () => {
      events.push('state');
    });
    same.setGridState(same.getGridState());
    expect(events).toEqual([]);
  });

  it('keeps a custom comparator across setGridState and rejects an order it cannot reproduce', () => {
    const comparator = ({ valueA, valueB }: SortComparatorParams<Employee>): number =>
      String(valueA).length - String(valueB).length;
    const defs: ColumnDefinition<Employee>[] = [{ field: 'name', sortable: true, comparator }];
    const api = createGrid<Employee>({
      columnDefs: defs,
      rowData: [employee(1, 'Ann'), employee(2, 'Ed')],
    });
    api.sortColumn('name', 'asc');
    expect(api.getGridState().displayedRowIds).toEqual(['2', '1']);

    const snapshot = api.getGridState();
    api.setGridState(snapshot);
    expect(api.getColumn('name')?.comparator).toBe(comparator);
    expect(api.getRowNodeAtIndex(0)?.data.name).toBe('Ed');

    const plain = grid(
      [employee(1, 'Ann'), employee(2, 'Ed')],
      [{ field: 'name', sortable: true }],
    );
    expect(() => {
      plain.setGridState(snapshot);
    }).toThrow(/Displayed row order/);
    expect(plain.getSortModel()).toEqual([]);
    expect(plain.getRowNodeAtIndex(0)?.data.name).toBe('Ann');
  });

  it('rejects invalid sort configuration and leaves the previous model in place', () => {
    expect(() => grid([employee(1, 'Ada')], [{ field: 'name', sort: 'asc' }])).toThrow(
      /not sortable/,
    );
    expect(() =>
      grid([employee(1, 'Ada')], [{ field: 'name', sortable: true, sort: 'up' as 'asc' }]),
    ).toThrow(/sort must be/);
    expect(() =>
      grid([employee(1, 'Ada')], [{ field: 'name', sortable: true, sortingOrder: [] }]),
    ).toThrow(/sortingOrder/);
    expect(() =>
      grid([employee(1, 'Ada')], [{ field: 'name', sortable: true, sortingOrder: ['asc', 'asc'] }]),
    ).toThrow(/duplicate/);
    expect(() =>
      grid([employee(1, 'Ada')], [{ field: 'name', sortable: true, comparator: 'name' as never }]),
    ).toThrow(/comparator/);
    expect(() =>
      createGrid<Employee>({
        columnDefs: columns,
        rowData: [],
        sorting: { caseSensitive: 'no' as unknown as boolean },
      }),
    ).toThrow(/caseSensitive/);
    expect(() =>
      createGrid<Employee>({
        columnDefs: columns,
        rowData: [],
        sorting: { accented: true } as never,
      }),
    ).toThrow(/unknown property "accented"/);

    const api = grid([employee(1, 'Grace'), employee(2, 'Ada')]);
    api.sortColumn('name', 'asc');
    expect(() => {
      api.setSortModel([
        { colId: 'name', sort: 'asc' },
        { colId: 'name', sort: 'desc' },
      ]);
    }).toThrow(/Duplicate sort column/);
    expect(() => {
      api.setSortModel([{ colId: 'missing', sort: 'asc' }]);
    }).toThrow(/Unknown sort column/);
    api.setColumnDefs([
      { field: 'name', sortable: false },
      { field: 'salary', sortable: true },
    ]);
    expect(() => {
      api.sortColumn('name', 'asc');
    }).toThrow(/not sortable/);
    expect(() => {
      api.setSortModel([{ colId: 'salary', sort: 'asc', sortIndex: 0 } as never]);
    }).toThrow(/unknown property "sortIndex"/);
    expect(() => {
      api.toggleSort('missing');
    }).toThrow(/Unknown sort column/);
    expect(() => {
      api.sortColumn('salary', 'sideways' as 'asc');
    }).toThrow(/Sort direction/);
    expect(api.getSortModel()).toEqual([]);
    expect(api.getRowNodeAtIndex(0)?.data.name).toBe('Grace');
  });
});
