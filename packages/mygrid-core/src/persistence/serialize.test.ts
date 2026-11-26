import { describe, expect, it } from 'vitest';
import { createGrid } from '../grid/create-grid';
import { GridError } from '../errors';
import { GRID_STATE_FORMAT_VERSION } from '../format';
import type { ColumnDefinition, GetRowIdParams } from '../types';
import { restoreGridState, serializeGridState } from './serialize';

interface Employee {
  id: number;
  name: string;
  department: string;
  salary: number;
}

interface Note {
  title: string;
}

const columns: ColumnDefinition<Employee>[] = [
  { field: 'name', headerName: 'Name', width: 160 },
  { field: 'salary', headerName: 'Salary', width: 120, minWidth: 80, maxWidth: 200 },
];

function employee(id: number, name: string, salary = 100): Employee {
  return { id, name, department: 'Engineering', salary };
}

describe('state serialization', () => {
  it('round-trips version 1 state, including selection and focus', () => {
    const api = createGrid<Employee>({
      columnDefs: columns,
      rowData: [employee(1, 'Ada'), employee(2, 'Grace', 120)],
    });
    api.setColumnState([{ colId: 'salary', hide: true, width: 150, pinned: 'right' }]);
    api.setSelectedRowIds(['2', '1']);
    api.setFocusedCell({ rowIndex: 1, columnId: 'name' });

    const json = serializeGridState(api.getGridState());
    const parsed: unknown = JSON.parse(json);
    expect(parsed).toMatchObject({ version: GRID_STATE_FORMAT_VERSION });

    const restored = restoreGridState<Employee>(json);
    expect(restored.rowIds).toEqual(['1', '2']);
    expect(restored.rowData.map((row) => row.name)).toEqual(['Ada', 'Grace']);
    expect(restored.columnState).toEqual([
      { colId: 'name', hide: false, width: 160, pinned: null },
      { colId: 'salary', hide: true, width: 150, pinned: 'right' },
    ]);
    expect(restored.selectedRowIds).toEqual(['2', '1']);
    expect(restored.focusedCell).toEqual({ rowIndex: 1, rowId: '2', columnId: 'name' });
    expect(restored.configuration).toEqual({
      formatVersion: 1,
      caseSensitive: true,
      filterCaseSensitive: true,
      selectionMode: 'multiple',
    });
    expect(restored.pagination).toEqual({
      enabled: false,
      page: 0,
      pageSize: 100,
      pageSizeOptions: [10, 25, 50, 100],
    });
    expect(restored.sortModel).toEqual([]);
    expect(restored.filterModel).toEqual({ join: 'and', filters: [] });
    expect(restored.displayedRowIds).toEqual(['1', '2']);

    const next = createGrid<Employee>({ columnDefs: columns, rowData: [] });
    next.setGridState(restored);
    expect(next.getSelectedRows().map((row) => row.name)).toEqual(['Grace', 'Ada']);
    expect(next.getColumn('salary')).toMatchObject({ hide: true, width: 150, pinned: 'right' });
    expect(next.getFocusedCell()).toEqual({ rowIndex: 1, rowId: '2', columnId: 'name' });
  });

  it('keeps generated ids and continues the counter after restoration', () => {
    const api = createGrid<Note>({
      columnDefs: [{ field: 'title', headerName: 'Title' }],
      rowData: [{ title: 'A' }, { title: 'B' }],
    });
    const restored = restoreGridState<Note>(serializeGridState(api.getGridState()));
    const next = createGrid<Note>({
      columnDefs: [{ field: 'title', headerName: 'Title' }],
      rowData: [{ title: 'existing' }],
    });

    next.setGridState(restored);
    expect(next.getGridState().rowIds).toEqual(['row:1', 'row:2']);
    next.insertRows(2, [{ title: 'C' }]);
    expect(next.getGridState().rowIds).toEqual(['row:1', 'row:2', 'row:3']);
  });

  it('restores getRowId identities only when the same function is supplied', () => {
    const getRowId = ({ data }: GetRowIdParams<Employee>): string => `emp-${data.id}`;
    const api = createGrid<Employee>({
      columnDefs: columns,
      rowData: [employee(4, 'Ada')],
      getRowId,
    });
    const json = serializeGridState(api.getGridState());

    expect(() => restoreGridState<Employee>(json)).toThrow(/does not match its row identity/);
    const restored = restoreGridState<Employee>(json, { getRowId });
    expect(restored.rowIds).toEqual(['emp-4']);

    const next = createGrid<Employee>({ columnDefs: columns, getRowId });
    next.setGridState(restored);
    expect(next.getRowNode('emp-4')?.data.name).toBe('Ada');

    const other = createGrid<Employee>({ columnDefs: columns, rowData: [employee(1, 'Grace')] });
    expect(() => {
      other.setGridState(restored);
    }).toThrow(/does not match/);
    expect(other.getRowCount()).toBe(1);
    expect(other.getRowNode('1')?.data.name).toBe('Grace');
  });

  it('serializes a shared nested object and omits host context', () => {
    const meta = { site: 'hq' };
    const api = createGrid<{ title: string; meta: { site: string } }, { token: string }>({
      columnDefs: [{ field: 'title' }],
      rowData: [
        { title: 'A', meta },
        { title: 'B', meta },
      ],
      context: { token: 'secret-context' },
    });

    const json = serializeGridState(api.getGridState());
    expect(json).not.toContain('secret-context');
    const restored = restoreGridState<{ title: string; meta: { site: string } }>(json);
    expect(restored.rowData.map((row) => row.meta.site)).toEqual(['hq', 'hq']);
  });

  it('rejects functions, class instances, cycles, and values JSON would rewrite', () => {
    const withFunction = createGrid<{ title: string; label: () => string }>({
      columnDefs: [{ field: 'title' }],
      rowData: [{ title: 'A', label: () => 'x' }],
    });
    expect(() => serializeGridState(withFunction.getGridState())).toThrow(/cannot be serialized/);
    expect(withFunction.getRowCount()).toBe(1);

    class NoteRow {
      constructor(readonly title: string) {}
    }
    const withClass = createGrid<NoteRow>({
      columnDefs: [{ field: 'title' }],
      rowData: [new NoteRow('A')],
    });
    expect(() => serializeGridState(withClass.getGridState())).toThrow(/plain object/);

    const cycle: { title: string; self?: object } = { title: 'A' };
    cycle.self = cycle;
    const withCycle = createGrid<{ title: string; self?: object }>({
      columnDefs: [{ field: 'title' }],
      rowData: [cycle],
    });
    expect(() => serializeGridState(withCycle.getGridState())).toThrow(/circular/i);

    const tags = new Array<string>(1);
    const withGap = createGrid<{ title: string; tags: string[] }>({
      columnDefs: [{ field: 'title' }],
      rowData: [{ title: 'A', tags }],
    });
    expect(() => serializeGridState(withGap.getGridState())).toThrow(/cannot be serialized/);
  });

  it('rejects an invalid snapshot before it can replace grid state', () => {
    const valid = createGrid<Employee>({
      columnDefs: columns,
      rowData: [employee(1, 'Ada')],
    });
    const json = serializeGridState(valid.getGridState());
    const parsed = JSON.parse(json) as { version: number; state: Record<string, unknown> };

    expect(() => restoreGridState('{')).toThrow(GridError);
    expect(() => restoreGridState('null')).toThrow(/object/);
    expect(() => restoreGridState(JSON.stringify({ version: 2, state: parsed.state }))).toThrow(
      /Unsupported grid state version 2/,
    );
    expect(() => restoreGridState(JSON.stringify({ version: '1', state: parsed.state }))).toThrow(
      /Unsupported grid state version 1/,
    );
    expect(() =>
      restoreGridState(JSON.stringify({ version: 1, state: parsed.state, extra: true })),
    ).toThrow(/unknown property "extra"/);

    parsed.state.selectedRowIds = ['missing'];
    expect(() => restoreGridState(JSON.stringify(parsed))).toThrow(/does not exist/);
    parsed.state.selectedRowIds = [];
    parsed.state.focusedCell = { rowIndex: 4, rowId: '1', columnId: 'name' };
    expect(() => restoreGridState(JSON.stringify(parsed))).toThrow(/does not match rowId/);
    parsed.state.focusedCell = null;
    parsed.state.rowIds = ['1', '2'];
    expect(() => restoreGridState(JSON.stringify(parsed))).toThrow(/same length/);

    expect(valid.getRowNode('1')?.data.name).toBe('Ada');
    expect(valid.getFocusedCell()).toBeNull();
  });
});
