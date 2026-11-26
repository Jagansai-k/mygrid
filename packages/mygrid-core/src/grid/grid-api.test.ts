import { describe, expect, it } from 'vitest';
import { isGridError } from '../errors';
import type { ColumnDefinition, GridEventType, GridOptions } from '../types';
import { createGrid } from './create-grid';

interface Employee {
  id: number;
  name: string;
  department: string;
  salary: number;
}

const columns: ColumnDefinition<Employee>[] = [
  { field: 'name', headerName: 'Name', width: 180, sortable: true },
  { field: 'department', headerName: 'Department', filterable: true },
  { field: 'salary', headerName: 'Salary', width: 120, minWidth: 80, maxWidth: 200 },
];

function employee(id: number, name: string, department = 'Engineering', salary = 100): Employee {
  return { id, name, department, salary };
}

function grid(
  rows: readonly Employee[] = [employee(1, 'Ada'), employee(2, 'Grace', 'Research', 120)],
) {
  return createGrid<Employee>({ columnDefs: columns, rowData: rows });
}

describe('grid API', () => {
  it('exposes rows, columns, and an equal displayed count', () => {
    const api = grid();

    expect(api.getRowCount()).toBe(2);
    expect(api.getDisplayedRowCount()).toBe(2);
    expect(api.getRowNode('1')?.data).toMatchObject({ name: 'Ada', salary: 100 });
    expect(api.getRowNodeAtIndex(1)?.id).toBe('2');
    expect(api.getColumn('salary')).toMatchObject({
      headerName: 'Salary',
      sortable: false,
      width: 120,
      minWidth: 80,
      maxWidth: 200,
    });
    expect(api.getColumn('department')).toMatchObject({ filterable: true, sortable: false });
    expect(api.getSelectedRowIds()).toEqual([]);
    expect(api.getFocusedCell()).toBeNull();
  });

  it('does not sort or filter when those flags are set', () => {
    const api = grid([employee(1, 'Grace'), employee(2, 'Ada')]);

    expect(api.getColumn('name')?.sortable).toBe(true);
    expect(api.getRowNodeAtIndex(0)?.data.name).toBe('Grace');
    expect(api.getRowNodeAtIndex(1)?.data.name).toBe('Ada');
    expect(api.getDisplayedRowCount()).toBe(2);
  });

  it('keeps stable ids through insert, replace, and removal', () => {
    const api = grid([employee(1, 'Ada')]);
    const ada = api.getRowNode('1');

    api.insertRows(1, [employee(2, 'Grace')]);
    expect(api.getRowNode('1')).toBe(ada);
    expect(api.getDisplayedRowCount()).toBe(2);

    const moved = api.getRowNode('2');
    api.insertRows(0, [employee(3, 'Lin')]);
    expect(api.getRowNode('1')?.id).toBe('1');
    expect(api.getRowNode('1')).not.toBe(ada);
    expect(api.getRowNode('2')).not.toBe(moved);
    expect(api.getRowNodeAtIndex(0)?.id).toBe('3');
    expect(api.getGridState().rowIds).toEqual(['3', '1', '2']);

    const replaced = employee(2, 'Grace Hopper', 'Research', 140);
    expect(api.replaceRow('2', replaced).data).toBe(replaced);
    expect(api.getRowNode('2')?.data.name).toBe('Grace Hopper');

    api.removeRows(['1']);
    expect(api.getRowNode('1')).toBeUndefined();
    expect(api.getRowNodeAtIndex(0)?.id).toBe('3');
    expect(api.getRowNodeAtIndex(1)?.id).toBe('2');
    expect(api.getRowCount()).toBe(2);
    expect(api.getDisplayedRowCount()).toBe(2);
  });

  it('updates row data in one transaction and rolls back an invalid one', () => {
    const api = grid();
    const result = api.updateRowData({
      remove: ['1'],
      update: [{ id: '2', data: employee(2, 'Grace Hopper') }],
      add: [employee(3, 'Lin')],
      addIndex: 0,
    });

    expect(result.removed.map((node) => node.id)).toEqual(['1']);
    expect(result.added.map((node) => node.data.name)).toEqual(['Lin']);
    expect(api.getGridState().rowData.map((row) => row.name)).toEqual(['Lin', 'Grace Hopper']);

    expect(() =>
      api.updateRowData({
        remove: ['2'],
        add: [employee(4, 'Katherine')],
        update: [{ id: 'missing', data: employee(8, 'No') }],
      }),
    ).toThrow(/missing row "missing"/);
    expect(api.getGridState().rowIds).toEqual(['3', '2']);
  });

  it('stores selection, drops ids for removed rows, and skips a no-op write', () => {
    const api = grid();
    const events: string[] = [];
    api.addEventListener('selectionChanged', () => {
      events.push('selection');
    });
    api.addEventListener('rowDataChanged', () => {
      events.push('rows');
    });
    api.addEventListener('stateChanged', (event) => {
      events.push(`state:${event.changes.join('+')}`);
    });

    api.setSelectedRowIds(['2', '1']);
    expect(api.getSelectedRows().map((row) => row.name)).toEqual(['Grace', 'Ada']);
    api.setSelectedRowIds(['2', '1']);
    api.removeRows(['2']);

    expect(api.getSelectedRowIds()).toEqual(['1']);
    expect(events).toEqual([
      'selection',
      'state:selectedRowIds',
      'rows',
      'selection',
      'state:rowData+rowIds+displayedRowIds+selectedRowIds',
    ]);
  });

  it('moves focus with the row and clears it when the row or column disappears', () => {
    const api = grid();
    const cells: (string | null)[] = [];
    api.addEventListener('cellFocused', (event) => {
      cells.push(event.cell === null ? null : `${event.cell.rowId}:${event.cell.rowIndex}`);
    });

    api.setFocusedCell({ rowIndex: 1, columnId: 'salary' });
    api.insertRows(0, [employee(3, 'Lin')]);
    expect(api.getFocusedCell()).toEqual({ rowIndex: 2, rowId: '2', columnId: 'salary' });

    api.setColumnState([{ colId: 'salary', hide: true, width: 120, pinned: null }]);
    expect(api.getFocusedCell()?.columnId).toBe('salary');

    api.removeRows(['2']);
    expect(api.getFocusedCell()).toBeNull();
    api.setFocusedCell({ rowIndex: 0, columnId: 'name' });
    api.setColumnDefs([{ field: 'name', headerName: 'Name' }]);
    expect(api.getFocusedCell()?.columnId).toBe('name');
    api.setColumnDefs([{ field: 'department', headerName: 'Department' }]);
    expect(api.getFocusedCell()).toBeNull();
    expect(cells).toEqual(['2:1', '2:2', null, '3:0', null]);
  });

  it('keeps definition width when column state changes and preserves a valid runtime width', () => {
    const api = grid([]);
    const snapshot = api.getColumn('salary');
    api.setColumnState([{ colId: 'salary', hide: true, width: 150, pinned: 'left' }]);

    expect(snapshot).toMatchObject({ width: 120, hide: false, pinned: null });
    expect(api.getColumn('salary')).toMatchObject({ width: 150, hide: true, pinned: 'left' });
    expect(api.getColumnDefs().find((definition) => definition.colId === 'salary')?.width).toBe(
      120,
    );

    api.setColumnDefs([
      { field: 'name', headerName: 'Name' },
      { field: 'salary', headerName: 'Pay', width: 90, minWidth: 80, maxWidth: 200 },
    ]);
    expect(api.getColumn('salary')).toMatchObject({ headerName: 'Pay', width: 150, hide: true });

    expect(() => {
      api.setColumnDefs([{ field: 'salary', headerName: 'Pay', minWidth: 180, maxWidth: 220 }]);
    }).toThrow(/below minWidth/);
    expect(api.getColumn('salary')?.headerName).toBe('Pay');
  });

  it('reads current cell values without changing state or emitting', () => {
    const row = employee(1, 'Ada', 'Engineering', 90);
    const api = grid([row]);
    let events = 0;
    for (const type of ['rowDataChanged', 'stateChanged', 'columnChanged'] as const) {
      api.addEventListener(type, () => {
        events += 1;
      });
    }

    row.name = 'Augusta';
    const values = api.refreshCells({ columnIds: ['name', 'salary'] });
    expect(values).toEqual([
      expect.objectContaining({
        rowId: '1',
        rowIndex: 0,
        columnId: 'name',
        field: 'name',
        value: 'Augusta',
      }),
      expect.objectContaining({ columnId: 'salary', field: 'salary', value: 90 }),
    ]);
    expect(api.refreshCells({ rowIds: [], columnIds: ['name'] })).toEqual([]);
    expect(events).toBe(0);
  });

  it('notifies state subscribers only when the snapshot changes', () => {
    const api = grid();
    const seen: number[] = [];
    const unsubscribe = api.subscribe((state, previous) => {
      seen.push(state.rowData.length, previous.rowData.length);
    });

    api.setRowData(api.getGridState().rowData);
    api.updateGridState((state) => ({
      ...state,
      selectedRowIds: ['1'],
    }));
    unsubscribe();
    api.setSelectedRowIds([]);

    expect(seen).toEqual([2, 2]);
    expect(api.getSelectedRowIds()).toEqual([]);
  });

  it('returns host context and replays gridReady to a later listener', () => {
    let ready = 0;
    const api = createGrid<Employee, { label: string }>({
      columnDefs: columns,
      rowData: [],
      context: { label: 'host' },
    });
    const listener = (): void => {
      ready += 1;
    };

    api.addEventListener('gridReady', listener);
    api.addEventListener('gridReady', listener);
    expect(api.getContext()).toEqual({ api, context: { label: 'host' } });
    expect(ready).toBe(1);

    expect(() => {
      api.addEventListener('gridReady', () => {
        throw new Error('not ready');
      });
    }).toThrow(/not ready/);
    api.addEventListener('selectionChanged', () => undefined);
    expect(ready).toBe(1);
  });

  it('runs every listener, commits first, and rejects re-entrant changes', () => {
    const api = grid();
    const seen: string[] = [];
    api.addEventListener('selectionChanged', () => {
      seen.push('a');
      expect(api.getSelectedRowIds()).toEqual(['1']);
      throw new Error('a failed');
    });
    api.addEventListener('selectionChanged', () => {
      seen.push('b');
    });

    expect(() => {
      api.setSelectedRowIds(['1']);
    }).toThrow(/a failed/);
    expect(seen).toEqual(['a', 'b']);

    const next = grid();
    next.addEventListener('selectionChanged', () => {
      next.setRowData([]);
    });
    expect(() => {
      next.setSelectedRowIds(['2']);
    }).toThrow(/cannot change/);
    expect(next.getRowCount()).toBe(2);
    expect(next.getSelectedRowIds()).toEqual(['2']);
  });

  it('removes listeners and stops a destroyed grid', () => {
    const api = grid([]);
    let calls = 0;
    const listener = (): void => {
      calls += 1;
    };
    api.addEventListener('columnChanged', listener);
    api.removeEventListener('columnChanged', listener);
    api.setColumnState([{ colId: 'name', hide: true, width: 180, pinned: null }]);
    expect(calls).toBe(0);

    api.destroy();
    api.destroy();
    expect(() => api.getRowCount()).toThrow(/destroyed/);
    expect(isGridError(new Error('no'))).toBe(false);
  });

  it('copies inputs and freezes the published snapshot', () => {
    const definition = { field: 'name' as const, headerName: 'Name' };
    const rows = [employee(1, 'Ada')];
    const api = createGrid<Employee>({ columnDefs: [definition], rowData: rows });
    definition.headerName = 'Changed';
    rows.push(employee(2, 'Grace'));

    expect(api.getColumn('name')?.headerName).toBe('Name');
    expect(api.getRowCount()).toBe(1);
    expect(Object.isFrozen(api.getGridState().rowData)).toBe(true);
    expect(() => {
      (api.getGridState().rowIds as string[]).push('9');
    }).toThrow(TypeError);
  });
});

describe('invalid grid configuration', () => {
  it('rejects bad options, focus, selection, refresh targets, and events', () => {
    expect(() => createGrid({ rowData: [] } as unknown as GridOptions<Employee>)).toThrow(
      /columnDefs/,
    );
    expect(() =>
      createGrid<Employee>({
        columnDefs: columns,
        rowData: [employee(1, 'Ada')],
        // @ts-expect-error the grid option is `sorting`, not `sort`
        sort: true,
      }),
    ).toThrow(/unknown property "sort"/);
    expect(() =>
      createGrid<Employee>({ columnDefs: [{ field: 'name' }, { field: 'name' }], rowData: [] }),
    ).toThrow(/Duplicate column id/);

    const api = grid([employee(1, 'Ada')]);
    expect(() => {
      api.setSelectedRowIds(['1', '1']);
    }).toThrow(/Duplicate selected/);
    expect(() => {
      api.setSelectedRowIds(['missing']);
    }).toThrow(/does not exist/);
    expect(api.getSelectedRowIds()).toEqual([]);
    expect(() => {
      api.setFocusedCell({ rowIndex: 3, columnId: 'name' });
    }).toThrow(/out of range/);
    expect(() => {
      api.setFocusedCell({ rowIndex: 0, columnId: 'missing' });
    }).toThrow(/does not exist/);
    expect(() => {
      api.setFocusedCell({ rowIndex: 0, columnId: 'name', rowId: 'other' });
    }).toThrow(/does not match rowId/);
    expect(() => api.insertRows(-1, [employee(2, 'Grace')])).toThrow(/addIndex/);
    expect(() => api.removeRows(['missing'])).toThrow(/missing row/);
    expect(() => api.refreshCells({ rowIds: ['missing'] })).toThrow(/Unknown rowIds/);
    expect(() => api.refreshCells({ columnIds: ['name', 'name'] })).toThrow(/Duplicate/);
    expect(() => {
      api.addEventListener('sorted' as GridEventType, () => undefined);
    }).toThrow(/Unknown grid event/);
    expect(api.getRowCount()).toBe(1);
    expect(api.getFocusedCell()).toBeNull();
  });
});
