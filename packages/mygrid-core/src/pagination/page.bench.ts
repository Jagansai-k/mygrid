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

type BenchKind = 'page' | 'select' | 'combined';

function measure(count: number, kind: BenchKind): number {
  const api = createGrid<BenchRow>({
    columnDefs: [
      { field: 'name', filterable: true },
      { field: 'department', filterable: true, sortable: true },
      { field: 'salary', filterable: true, sortable: true },
    ],
    rowData: rows(count),
    pagination: { enabled: true, pageSize: 100 },
  });
  const filter = {
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
  const last = api.getPageCount() - 1;
  if (kind === 'page') {
    api.setPage(last);
    api.setPage(0);
  } else if (kind === 'select') {
    api.selectAllSourceRows();
    api.clearSelection();
  } else {
    api.setFilterModel(filter);
    api.setSortModel([{ colId: 'salary', sort: 'asc' }]);
    api.setPage(1);
    api.clearAllFilters();
    api.clearSort();
    api.setPage(0);
  }
  const samples: number[] = [];
  const runs = count >= 50_000 ? 3 : 5;
  for (let run = 0; run < runs; run += 1) {
    if (kind === 'page') {
      const target = api.getCurrentPage() === 0 ? last : 0;
      const started = performance.now();
      api.setPage(target);
      samples.push(performance.now() - started);
    } else if (kind === 'select') {
      const started = performance.now();
      api.selectAllSourceRows();
      samples.push(performance.now() - started);
      api.clearSelection();
    } else {
      const started = performance.now();
      api.setFilterModel(filter);
      api.setSortModel([{ colId: 'salary', sort: 'asc' }]);
      api.setPage(1);
      samples.push(performance.now() - started);
      api.clearAllFilters();
      api.clearSort();
      api.setPage(0);
    }
  }
  if (kind === 'page') {
    api.setPage(2);
    const onPage = api.getRowNodeAtPageIndex(0)?.id;
    const inFullList = api.getRowNodeAtIndex(200)?.id;
    if (onPage === undefined || onPage !== inFullList || api.getDisplayedRowCount() !== count) {
      throw new Error(`Page window for ${count} rows did not keep the filtered list.`);
    }
  } else if (kind === 'select') {
    api.selectAllSourceRows();
    if (api.getSelectedRowIds().length !== count) {
      throw new Error(`Source selection for ${count} rows did not select every row.`);
    }
  } else {
    api.setFilterModel(filter);
    api.setSortModel([{ colId: 'salary', sort: 'asc' }]);
    const filtered = api.getDisplayedRowCount();
    if (filtered !== Math.floor(count / departments.length)) {
      throw new Error(`Combined filter for ${count} rows kept ${filtered} rows.`);
    }
    api.setPage(1);
    const pageId = api.getRowNodeAtPageIndex(0)?.id;
    const listId = api.getRowNodeAtIndex(100)?.id;
    if (pageId === undefined || pageId !== listId) {
      throw new Error(`Combined page for ${count} rows did not follow the sorted filter.`);
    }
  }
  api.destroy();
  return median(samples);
}

describe('pagination and selection benchmark', () => {
  it('measures paging, source selection, and filter-sort-page together', () => {
    const results = sizes.flatMap((count) => [
      { rows: count, kind: 'page' as const, milliseconds: measure(count, 'page') },
      { rows: count, kind: 'select' as const, milliseconds: measure(count, 'select') },
      { rows: count, kind: 'combined' as const, milliseconds: measure(count, 'combined') },
    ]);
    console.log('MyGrid page benchmark (median milliseconds)');
    for (const result of results) {
      console.log(
        `${String(result.rows).padStart(7)} rows  ${result.kind.padEnd(8)}  ${result.milliseconds.toFixed(2)} ms`,
      );
    }
    expect(results.every((result) => result.milliseconds >= 0)).toBe(true);
  });
});
