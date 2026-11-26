import { describe, expect, it } from 'vitest';
import { createGrid } from './create-grid';
import type { ColumnDefinition } from '../types';

interface Employee {
  id: number;
  name: string;
  department: string;
  salary: number;
}

const columns: ColumnDefinition<Employee>[] = [
  { field: 'name', headerName: 'Name' },
  { field: 'salary', headerName: 'Salary' },
];

describe('generic row types', () => {
  it('reads fields from the caller-supplied row type', () => {
    const api = createGrid<Employee>({
      columnDefs: columns,
      rowData: [{ id: 1, name: 'Ada', department: 'Engineering', salary: 120 }],
    });
    const node = api.getRowNode('1');
    if (node === undefined) {
      throw new Error('Expected the employee row.');
    }

    const name: string = node.data.name;
    const salary: number = node.data.salary;
    expect(name).toBe('Ada');
    expect(salary).toBe(120);
    expect(api.getRowNodeAtIndex(0)?.data.department).toBe('Engineering');
  });

  it('rejects a column field that is not on the row type', () => {
    const column: ColumnDefinition<Employee> = {
      // @ts-expect-error departmentCode is not a field of Employee
      field: 'departmentCode',
    };

    expect(column.field).toBe('departmentCode');
  });
});
