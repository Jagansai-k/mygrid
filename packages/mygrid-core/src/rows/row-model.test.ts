import { describe, expect, it } from 'vitest';
import { GridError } from '../errors';
import type { GetRowIdParams } from '../types';
import { RowModel } from './row-model';

interface Employee {
  id: number;
  name: string;
  department: string;
  salary: number;
}

function employee(id: number, name: string, department = 'Engineering', salary = 100): Employee {
  return { id, name, department, salary };
}

function modelWith(
  rows: readonly Employee[],
  getRowId?: (params: GetRowIdParams<Employee>) => string,
) {
  const model = new RowModel<Employee>(getRowId);
  model.commit(model.planSetData(rows));
  return model;
}

describe('row model', () => {
  it('uses a numeric or string id and looks rows up by id and index', () => {
    const model = modelWith([
      employee(1, 'Ada'),
      { id: '2' as unknown as number, name: 'Grace', department: 'Research', salary: 120 },
    ]);

    expect(model.getNodes().map((node) => node.id)).toEqual(['1', '2']);
    expect(model.getNode('1')?.data.name).toBe('Ada');
    expect(model.getNodeAt(1)?.rowIndex).toBe(1);
    expect(model.getNode('missing')).toBeUndefined();
    expect(model.getNodeAt(-1)).toBeUndefined();
    expect(model.getNodeAt(1.5)).toBeUndefined();
    expect(model.getNodeAt(2)).toBeUndefined();
  });

  it('prefers getRowId over the id field and passes the destination index', () => {
    const seen: number[] = [];
    const model = modelWith([employee(7, 'Ada')], ({ data, rowIndex }) => {
      seen.push(rowIndex);
      return `emp-${data.id}`;
    });

    expect(model.getNode('emp-7')?.data.id).toBe(7);
    expect(model.getNode('7')).toBeUndefined();
    expect(seen).toEqual([0]);

    seen.length = 0;
    const inserted = model.planTransaction({ add: [employee(8, 'Grace')], addIndex: 0 });
    model.commit(inserted.plan);

    expect(seen).toEqual([0]);
    expect(model.getNode('emp-7')?.rowIndex).toBe(1);
    expect(model.getNode('emp-8')?.rowIndex).toBe(0);
  });

  it('keeps generated ids on the same objects and does not reuse a deleted id', () => {
    interface Note {
      title: string;
    }
    const first = { title: 'A' };
    const second = { title: 'B' };
    const model = new RowModel<Note>();
    model.commit(model.planSetData([first]));
    const original = model.getNode('row:1');

    model.commit(model.planSetData([second, first]));
    expect(model.getNodes().map((node) => [node.id, node.data])).toEqual([
      ['row:2', second],
      ['row:1', first],
    ]);
    expect(model.getNode('row:1')).not.toBe(original);

    model.commit(model.planTransaction({ remove: ['row:1'] }).plan);
    model.commit(model.planTransaction({ add: [{ title: 'C' }] }).plan);
    expect(model.getNodes().map((node) => node.id)).toEqual(['row:2', 'row:3']);
  });

  it('reuses the node object when an append does not move it', () => {
    const model = modelWith([employee(1, 'Ada')]);
    const node = model.getNode('1');
    const planned = model.planTransaction({ add: [employee(2, 'Grace')] });
    model.commit(planned.plan);

    expect(model.getNode('1')).toBe(node);
    expect(planned.result.added.map((added) => added.id)).toEqual(['2']);
    expect(model.getNodeAt(0)?.rowIndex).toBe(0);
  });

  it('gives a moved row a new node and the same id and data', () => {
    const model = modelWith([employee(1, 'Ada'), employee(2, 'Grace')]);
    const grace = model.getNode('2');
    model.commit(model.planTransaction({ remove: ['1'] }).plan);
    const moved = model.getNode('2');

    expect(moved).not.toBe(grace);
    expect(moved?.id).toBe('2');
    expect(moved?.data).toBe(grace?.data);
    expect(moved?.rowIndex).toBe(0);
  });

  it('replaces row data without changing the id', () => {
    const model = modelWith([employee(1, 'Ada')]);
    const next = employee(1, 'Augusta', 'Research', 140);
    const planned = model.planTransaction({ update: [{ id: '1', data: next }] });
    model.commit(planned.plan);

    expect(planned.result.updated).toEqual([
      expect.objectContaining({ id: '1', rowIndex: 0, data: next }),
    ]);
    expect(model.getNode('1')?.data).toBe(next);
  });

  it('keeps an explicit id for a row that has no natural id', () => {
    interface Note {
      title: string;
    }
    const model = new RowModel<Note>();
    const note = { title: 'A' };
    model.commit(model.planExplicit([note], ['row:5']));

    expect(model.getNode('row:5')?.data).toBe(note);
    model.commit(model.planSetData([note, { title: 'B' }]));
    expect(model.getNodes().map((node) => node.id)).toEqual(['row:5', 'row:6']);
  });

  it('rejects invalid rows and leaves the previous list in place', () => {
    const model = modelWith([employee(1, 'Ada')]);

    expect(() => model.planSetData([employee(1, 'Ada'), employee(1, 'Grace')])).toThrow(
      /Duplicate row id "1"/,
    );
    expect(() =>
      model.planSetData([{ id: true, name: 'Grace', department: 'Engineering', salary: 1 }]),
    ).toThrow(/string or a finite number/);
    expect(() => model.planSetData([null])).toThrow(/must be an object/);
    expect(() => model.planSetData('rows' as unknown as Employee[])).toThrow(/array/);
    expect(() =>
      model.planTransaction({ update: [{ id: '1', data: employee(9, 'Grace') }] }),
    ).toThrow(/does not match its row identity "9"/);
    expect(() => model.planTransaction({ remove: ['1', '1'] })).toThrow(/Duplicate remove/);
    expect(() => model.planTransaction({ remove: ['missing'] })).toThrow(/missing row "missing"/);
    expect(() =>
      model.planTransaction({ remove: ['1'], update: [{ id: '1', data: employee(1, 'Ada') }] }),
    ).toThrow(/updated and removed/);
    expect(() => model.planTransaction({ add: [employee(2, 'Grace')], addIndex: 4 })).toThrow(
      /addIndex/,
    );
    expect(() => model.planTransaction({ addIndex: 1.5 })).toThrow(/integer/);
    expect(model.getNodes().map((node) => node.id)).toEqual(['1']);
    expect(model.getNode('1')?.data.name).toBe('Ada');
  });

  it('applies a transaction in remove, update, add order or not at all', () => {
    const model = modelWith([employee(1, 'Ada'), employee(2, 'Grace'), employee(3, 'Lin')]);
    const updated = employee(2, 'Grace Hopper');
    const planned = model.planTransaction({
      remove: ['1'],
      update: [{ id: '2', data: updated }],
      add: [employee(4, 'Katherine')],
      addIndex: 1,
    });
    model.commit(planned.plan);

    expect(model.getNodes().map((node) => [node.id, node.data.name, node.rowIndex])).toEqual([
      ['2', 'Grace Hopper', 0],
      ['4', 'Katherine', 1],
      ['3', 'Lin', 2],
    ]);
    expect(planned.result.removed.map((node) => node.id)).toEqual(['1']);
    expect(planned.result.removed[0]?.rowIndex).toBe(0);
    expect(planned.result.updated.map((node) => node.data)).toEqual([updated]);
    expect(planned.result.added.map((node) => node.rowIndex)).toEqual([1]);

    expect(() =>
      model.planTransaction({
        remove: ['3'],
        add: [employee(3, 'Duplicate')],
        update: [{ id: 'missing', data: employee(8, 'No') }],
      }),
    ).toThrow(GridError);
    expect(model.getNodes().map((node) => node.id)).toEqual(['2', '4', '3']);
  });
});
