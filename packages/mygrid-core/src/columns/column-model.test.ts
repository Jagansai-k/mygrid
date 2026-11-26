import { describe, expect, it } from 'vitest';
import type { ColumnDefinition, ColumnState } from '../types';
import { ColumnModel } from './column-model';

interface Employee {
  id: number;
  name: string;
  department: string;
  salary: number;
}

const salary: ColumnDefinition<Employee> = {
  field: 'salary',
  headerName: 'Salary',
  width: 120,
  minWidth: 80,
  maxWidth: 200,
};

function committed(defs: readonly ColumnDefinition<Employee>[]): ColumnModel<Employee> {
  const model = new ColumnModel<Employee>();
  model.commit(model.planColumnDefs(defs));
  return model;
}

describe('column model', () => {
  it('assigns ids, headers, defaults, and pin none', () => {
    const model = committed([
      { field: 'name' },
      { colId: 'dept', field: 'department', headerName: 'Team', pinned: 'none' },
      { colId: 'actions', headerName: 'Actions', sortable: true, filterable: true },
    ]);

    expect(model.getColumn('name')).toMatchObject({
      colId: 'name',
      field: 'name',
      headerName: 'name',
      hide: false,
      width: null,
      minWidth: null,
      maxWidth: null,
      pinned: null,
      sortable: false,
      filterable: false,
    });
    expect(model.getColumn('dept')).toMatchObject({
      field: 'department',
      headerName: 'Team',
      pinned: null,
    });
    expect(model.getColumn('actions')).toMatchObject({
      field: null,
      headerName: 'Actions',
      sortable: true,
      filterable: true,
    });
    expect(model.getColumns().map((column) => column.colId)).toEqual(['name', 'dept', 'actions']);
  });

  it('allows two columns on one field when their ids differ', () => {
    const model = committed([
      { colId: 'name-a', field: 'name', headerName: 'A' },
      { colId: 'name-b', field: 'name', headerName: 'B' },
    ]);

    expect(model.getColumn('name-a')?.field).toBe('name');
    expect(model.getColumn('name-b')?.field).toBe('name');
  });

  it('rejects definitions that cannot identify a column or that break width rules', () => {
    const model = new ColumnModel<Employee>();
    const definitions: unknown[] = [
      null,
      [],
      {},
      { field: 'name', colId: 'name' },
      { field: 'name', valueGetter: () => '' },
      { field: ' ', headerName: 'Name' },
      { colId: 'name', headerName: '   ' },
      { field: 'name', width: 0 },
      { field: 'name', width: Number.NaN },
      { field: 'name', width: '120' },
      { field: 'name', minWidth: 50, maxWidth: 40 },
      { field: 'name', width: 10, minWidth: 20 },
      { field: 'name', width: 30, maxWidth: 20 },
      { field: 'name', hide: 'false' },
      { field: 'name', pinned: 'top' },
      { field: 'name', sortable: 1 },
    ];

    expect(() => model.planColumnDefs(definitions[0])).toThrow(/array/);
    expect(() => model.planColumnDefs([[]])).toThrow(/object/);
    expect(() => model.planColumnDefs([definitions[2]])).toThrow(/colId or a field/);
    expect(() => model.planColumnDefs([{ field: 'name' }, { field: 'name' }])).toThrow(
      /Duplicate column id "name"/,
    );
    expect(() => model.planColumnDefs([definitions[4]])).toThrow(/unknown property "valueGetter"/);
    expect(() => model.planColumnDefs([definitions[5]])).toThrow(/field/);
    expect(() => model.planColumnDefs([definitions[6]])).toThrow(/headerName/);
    expect(() => model.planColumnDefs([definitions[7]])).toThrow(/width/);
    expect(() => model.planColumnDefs([definitions[8]])).toThrow(/width/);
    expect(() => model.planColumnDefs([definitions[9]])).toThrow(/width/);
    expect(() => model.planColumnDefs([definitions[10]])).toThrow(/minWidth cannot be greater/);
    expect(() => model.planColumnDefs([definitions[11]])).toThrow(/below minWidth/);
    expect(() => model.planColumnDefs([definitions[12]])).toThrow(/above maxWidth/);
    expect(() => model.planColumnDefs([definitions[13]])).toThrow(/hide/);
    expect(() => model.planColumnDefs([definitions[14]])).toThrow(/pinned/);
    expect(() => model.planColumnDefs([definitions[15]])).toThrow(/sortable/);
    expect(model.getColumns()).toEqual([]);
  });

  it('accepts a width that sits on the minimum or maximum', () => {
    const model = committed([{ field: 'name', width: 80, minWidth: 80, maxWidth: 80 }]);

    expect(model.getColumn('name')?.width).toBe(80);
  });

  it('keeps a snapshot when runtime width, visibility, or pin changes', () => {
    const model = committed([salary, { field: 'name', headerName: 'Name', width: 160 }]);
    const before = model.getColumn('salary');
    const next: ColumnState = { colId: 'salary', hide: true, width: 150, pinned: 'left' };

    model.commit(model.planColumnState([next]));

    expect(before).toMatchObject({ width: 120, hide: false, pinned: null });
    expect(model.getColumn('salary')).toMatchObject({ width: 150, hide: true, pinned: 'left' });
    expect(model.getColumn('name')?.width).toBe(160);
    expect(
      model.getDefinitions().find((definition) => definition.colId === 'salary'),
    ).toMatchObject({
      width: 120,
      hide: false,
      pinned: null,
    });
  });

  it('rejects unknown, duplicate, and out-of-range column state without publishing it', () => {
    const model = committed([salary]);
    const invalid: ColumnState[] = [
      { colId: 'missing', hide: false, width: null, pinned: null },
      { colId: 'salary', hide: false, width: 10, pinned: null },
    ];

    expect(() => model.planColumnState([invalid[0]])).toThrow(/Unknown column "missing"/);
    expect(() => model.planColumnState([invalid[1]])).toThrow(/below minWidth/);
    expect(() =>
      model.planColumnState([
        { colId: 'salary', hide: false, width: 100, pinned: null },
        { colId: 'salary', hide: true, width: 100, pinned: null },
      ]),
    ).toThrow(/Duplicate column id "salary"/);
    expect(model.getColumn('salary')).toMatchObject({ width: 120, hide: false });
  });

  it('keeps runtime width across a definition update and rejects a width the new range cannot hold', () => {
    const model = committed([salary]);
    model.commit(
      model.planColumnState([{ colId: 'salary', hide: true, width: 150, pinned: 'right' }]),
    );

    model.commit(
      model.planColumnDefs([
        { field: 'salary', headerName: 'Pay', width: 90, minWidth: 80, maxWidth: 200 },
      ]),
    );
    expect(model.getColumn('salary')).toMatchObject({
      headerName: 'Pay',
      width: 150,
      hide: true,
      pinned: 'right',
    });
    expect(model.getDefinitions()[0]).toMatchObject({ headerName: 'Pay', width: 90, hide: false });

    expect(() =>
      model.planColumnDefs([{ field: 'salary', headerName: 'Pay', minWidth: 180, maxWidth: 240 }]),
    ).toThrow(/below minWidth/);
    expect(model.getColumn('salary')?.width).toBe(150);
  });

  it('uses definition order when the full column state is listed in another order', () => {
    const model = new ColumnModel<Employee>();
    const records = model.planColumnModel(
      [
        { field: 'name', headerName: 'Name' },
        { field: 'salary', headerName: 'Salary' },
      ],
      [
        { colId: 'salary', hide: true, width: 90, pinned: 'right' },
        { colId: 'name', hide: false, width: 140, pinned: null },
      ],
    );

    expect(records.map((record) => record.definition.colId)).toEqual(['name', 'salary']);
    expect(records.map((record) => record.state.width)).toEqual([140, 90]);
  });
});
