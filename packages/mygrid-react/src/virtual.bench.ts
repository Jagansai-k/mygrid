/** @vitest-environment jsdom */
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { MyGrid } from './index';

interface BenchRow {
  id: string;
  name: string;
  department: string;
  score: number;
  note: string;
}

const sizes = [1_000, 10_000, 50_000, 100_000] as const;
type Mode = 'plain' | 'rows' | 'both';

const columns = [
  { field: 'name' as const, headerName: 'Name', pinned: 'left' as const, width: 160 },
  ...Array.from({ length: 10 }, (_, index) => ({
    field: 'department' as const,
    colId: `c${String(index)}`,
    headerName: `Column ${String(index)}`,
    width: 160,
  })),
  { field: 'note' as const, headerName: 'Note', pinned: 'right' as const, width: 160 },
];

function rows(count: number): BenchRow[] {
  const data: BenchRow[] = [];
  for (let index = 0; index < count; index += 1) {
    data.push({
      id: String(index),
      name: `n${String(index)}`,
      department: 'Research',
      score: index,
      note: 'note',
    });
  }
  return data;
}

function median(samples: readonly number[]): number {
  const ordered = [...samples].sort((left, right) => left - right);
  const middle = Math.floor(ordered.length / 2);
  return ordered[middle] ?? 0;
}

function mounted(host: HTMLElement): { rows: number; cells: number } {
  return {
    rows: host.querySelectorAll('tbody tr[data-row-id]').length,
    cells: host.querySelectorAll('tbody tr[data-row-id] > td:not(.mygrid-col-spacer)').length,
  };
}

async function sample(
  count: number,
  mode: Mode,
): Promise<{
  rows: number;
  cells: number;
  initial: number;
  scroll: number;
}> {
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(400);
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(800);
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  const data = rows(count);
  const started = performance.now();
  act(() => {
    root.render(
      createElement(MyGrid<BenchRow>, {
        columnDefs: columns,
        rowData: data,
        rowHeight: 40,
        headerHeight: 44,
        selection: { mode: 'none' },
        ...(mode === 'plain' ? { virtualizeRows: false, virtualizeColumns: false } : {}),
        ...(mode === 'rows' ? { virtualizeColumns: false } : {}),
      }),
    );
  });
  const initial = performance.now() - started;
  const scroller = host.querySelector('.mygrid-scroll');
  if (!(scroller instanceof HTMLElement)) {
    throw new Error('Missing scroll container');
  }
  const scrollStarted = performance.now();
  scroller.scrollTop = 4_000;
  scroller.dispatchEvent(new Event('scroll'));
  await act(async () => {
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        resolve();
      });
    });
  });
  const scroll = performance.now() - scrollStarted;
  const counts = mounted(host);
  act(() => {
    root.unmount();
  });
  host.remove();
  vi.restoreAllMocks();
  return { ...counts, initial, scroll };
}

describe('virtualization benchmark', () => {
  it('measures mounted rows, mounted cells, first paint, and a scroll update', async () => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    const results: {
      rows: number;
      mode: Mode;
      renderedRows: number;
      renderedCells: number;
      initial: number;
      scroll: number;
    }[] = [];
    for (const count of sizes) {
      const modes: Mode[] = count <= 10_000 ? ['plain', 'rows', 'both'] : ['rows', 'both'];
      for (const mode of modes) {
        const runs = count >= 50_000 || mode === 'plain' ? 1 : 3;
        const samples = [];
        for (let run = 0; run < runs; run += 1) {
          samples.push(await sample(count, mode));
        }
        results.push({
          rows: count,
          mode,
          renderedRows: samples[0]?.rows ?? 0,
          renderedCells: samples[0]?.cells ?? 0,
          initial: median(samples.map((entry) => entry.initial)),
          scroll: median(samples.map((entry) => entry.scroll)),
        });
      }
    }
    console.log('MyGrid virtualization benchmark');
    console.log('rows     mode   DOM rows  DOM cells  initial ms  scroll ms');
    for (const result of results) {
      console.log(
        `${String(result.rows).padStart(7)}  ${result.mode.padEnd(5)}  ${String(result.renderedRows).padStart(8)}  ${String(result.renderedCells).padStart(9)}  ${result.initial.toFixed(2).padStart(10)}  ${result.scroll.toFixed(2).padStart(9)}`,
      );
    }
    const virtual = results.filter((result) => result.mode !== 'plain');
    expect(virtual.every((result) => result.renderedRows < result.rows)).toBe(true);
    expect(virtual.every((result) => result.renderedRows < 40)).toBe(true);
    const plain = results.filter((result) => result.mode === 'plain');
    expect(plain.every((result) => result.renderedRows === result.rows)).toBe(true);
  });
});
