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
      name: `n${String(index).padStart(6, '0')}`,
      department: departments[index % departments.length] ?? 'Apps',
      salary: (index * 17) % 10_000,
    });
  }
  return data;
}

function median(samples: readonly number[]): number {
  const ordered = [...samples].sort((left, right) => left - right);
  const middle = Math.floor(ordered.length / 2);
  return ordered[middle] ?? 0;
}

type BenchKind = 'single' | 'multi' | 'sorted';

function measure(count: number, kind: BenchKind): number {
  const data = rows(count);
  const api = createGrid<BenchRow>({
    columnDefs: [
      { field: 'name', filterable: true },
      { field: 'department', filterable: true, sortable: true },
      { field: 'salary', filterable: true, sortable: true },
    ],
    rowData: data,
  });
  const single = {
    filters: [
      {
        colId: 'department',
        filter: {
          filterType: 'text' as const,
          conditions: [{ type: 'equals' as const, filter: 'Platform' }],
        },
      },
    ],
  };
  const multi = {
    filters: [
      ...single.filters,
      {
        colId: 'salary',
        filter: {
          filterType: 'number' as const,
          conditions: [{ type: 'greaterThan' as const, filter: 5_000 }],
        },
      },
    ],
  };
  const model = kind === 'single' ? single : multi;
  api.setFilterModel(model);
  if (kind === 'sorted') {
    api.setSortModel([{ colId: 'salary', sort: 'asc' }]);
  }
  api.clearAllFilters();
  if (kind === 'sorted') {
    api.clearSort();
  }
  const samples: number[] = [];
  const runs = count >= 50_000 ? 3 : 5;
  for (let run = 0; run < runs; run += 1) {
    const started = performance.now();
    api.setFilterModel(model);
    if (kind === 'sorted') {
      api.setSortModel([{ colId: 'salary', sort: 'asc' }]);
    }
    samples.push(performance.now() - started);
    api.clearAllFilters();
    if (kind === 'sorted') {
      api.clearSort();
    }
  }
  api.setFilterModel(model);
  const displayed = api.getFilteredRowCount();
  if (kind === 'single' && displayed !== Math.floor(count / departments.length)) {
    throw new Error(`Single-column filter for ${count} rows kept ${displayed} rows.`);
  }
  if (kind === 'sorted') {
    api.setSortModel([{ colId: 'salary', sort: 'asc' }]);
    const first = api.getRowNodeAtIndex(0)?.data.salary;
    const second = api.getRowNodeAtIndex(1)?.data.salary;
    if (first === undefined || first <= 5_000 || (second !== undefined && second < first)) {
      throw new Error(`Filtered sort for ${count} rows did not order the matching salaries.`);
    }
  }
  api.destroy();
  return median(samples);
}

describe('filter benchmark', () => {
  it('measures single-column, multi-column, and filtered sorting', () => {
    const results = sizes.flatMap((count) => [
      { rows: count, kind: 'single' as const, milliseconds: measure(count, 'single') },
      { rows: count, kind: 'multi' as const, milliseconds: measure(count, 'multi') },
      { rows: count, kind: 'sorted' as const, milliseconds: measure(count, 'sorted') },
    ]);
    console.log('MyGrid filter benchmark (median milliseconds, setFilterModel)');
    for (const result of results) {
      console.log(
        `${String(result.rows).padStart(7)} rows  ${result.kind.padEnd(6)}  ${result.milliseconds.toFixed(2)} ms`,
      );
    }
    expect(results.every((result) => result.milliseconds >= 0)).toBe(true);
  });
});
