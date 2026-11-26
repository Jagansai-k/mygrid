import { describe, expect, it } from 'vitest';
import { createGrid } from '../grid/create-grid';

interface BenchRow {
  id: number;
  name: string;
  department: string;
  salary: number;
}

const departments = ['Apps', 'Platform', 'Research', 'Finance'];
const sizes = [1_000, 10_000, 50_000, 100_000];

function rows(count: number): BenchRow[] {
  const data: BenchRow[] = [];
  for (let index = 0; index < count; index += 1) {
    data.push({
      id: index,
      name: `n${String(count - index).padStart(6, '0')}`,
      department: departments[index % departments.length] ?? 'Apps',
      salary: (index * 17) % 10_000,
    });
  }
  return data;
}

function median(samples: readonly number[]): number {
  const ordered = [...samples].sort((left, right) => left - right);
  const middle = Math.floor(ordered.length / 2);
  const value = ordered[middle];
  return value ?? 0;
}

function measure(count: number, columns: 1 | 2): number {
  const data = rows(count);
  const api = createGrid<BenchRow>({
    columnDefs: [
      { field: 'salary', sortable: true },
      { field: 'department', sortable: true },
      { field: 'name', sortable: true },
    ],
    rowData: data,
  });
  const model =
    columns === 1
      ? [{ colId: 'salary', sort: 'asc' as const }]
      : [
          { colId: 'department', sort: 'asc' as const },
          { colId: 'salary', sort: 'desc' as const },
        ];
  api.setSortModel(model);
  api.clearSort();
  const samples: number[] = [];
  const runs = count >= 50_000 ? 3 : 5;
  for (let run = 0; run < runs; run += 1) {
    const started = performance.now();
    api.setSortModel(model);
    samples.push(performance.now() - started);
    api.clearSort();
  }
  const first = api.getRowNodeAtIndex(0);
  api.setSortModel(model);
  if (columns === 1 && first !== undefined && api.getRowNodeAtIndex(0)?.data.salary !== 0) {
    throw new Error(`Single-column sort for ${count} rows did not put salary 0 first.`);
  }
  api.destroy();
  return median(samples);
}

describe('sort benchmark', () => {
  it('measures single-column and multi-column sorting', () => {
    const results = sizes.flatMap((count) => [
      { rows: count, columns: 1, milliseconds: measure(count, 1) },
      { rows: count, columns: 2, milliseconds: measure(count, 2) },
    ]);
    console.log('MyGrid sort benchmark (median milliseconds, setSortModel)');
    for (const result of results) {
      console.log(
        `${String(result.rows).padStart(7)} rows  ${String(result.columns)} column  ${result.milliseconds.toFixed(2)} ms`,
      );
    }
    expect(results.every((result) => result.milliseconds >= 0)).toBe(true);
  });
});
