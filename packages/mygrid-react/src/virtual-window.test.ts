import { describe, expect, it } from 'vitest';
import {
  DEFAULT_COLUMN_WIDTH,
  columnWindow,
  resolvedColumnWidth,
  rowWindow,
} from './virtual-window';
import type { SizedColumn } from './virtual-window';

const center = (count: number, width = 100): SizedColumn[] =>
  Array.from({ length: count }, (_, index) => ({
    colId: `c${String(index)}`,
    width,
    pinned: null,
  }));

describe('rowWindow', () => {
  it('starts at the first row when the scroll position is at the top', () => {
    expect(rowWindow(0, 200, 44, 40, 1000, 1)).toEqual({ start: 0, end: 5 });
  });

  it('moves the window down with the scroll position', () => {
    expect(rowWindow(2000, 200, 44, 40, 100000, 1)).toEqual({ start: 47, end: 55 });
  });

  it('moves the window back up', () => {
    expect(rowWindow(400, 200, 44, 40, 100000, 1)).toEqual({ start: 7, end: 15 });
  });

  it('keeps overscan rows outside the viewport', () => {
    expect(rowWindow(2000, 200, 44, 40, 100000, 6).start).toBe(42);
    expect(rowWindow(2000, 200, 44, 40, 100000, 0)).toEqual({ start: 48, end: 54 });
  });

  it('returns an empty range for an empty dataset', () => {
    expect(rowWindow(0, 400, 44, 40, 0, 6)).toEqual({ start: 0, end: 0 });
  });

  it('renders a dataset smaller than the viewport', () => {
    expect(rowWindow(0, 400, 44, 40, 3, 6)).toEqual({ start: 0, end: 3 });
  });

  it('clamps a 100,000-row dataset to the viewport', () => {
    const window = rowWindow(0, 400, 44, 40, 100000, 6);
    expect(window.end - window.start).toBeLessThan(30);
    expect(window.end).toBeLessThan(100000);
  });

  it('uses a fallback viewport before layout and expands when the container grows', () => {
    const before = rowWindow(0, 0, 44, 40, 100000, 2);
    const after = rowWindow(0, 800, 44, 40, 100000, 2);
    expect(after.end).toBeGreaterThan(before.end);
  });
});

describe('columnWindow', () => {
  const pinned: SizedColumn[] = [
    { colId: 'left', width: 120, pinned: 'left' },
    ...center(20),
    { colId: 'right', width: 80, pinned: 'right' },
  ];

  it('renders the columns that overlap the initial viewport', () => {
    const window = columnWindow(pinned, 0, 300, 0, 0);
    expect(window.left.map((column) => column.colId)).toEqual(['left']);
    expect(window.right.map((column) => column.colId)).toEqual(['right']);
    expect(window.center.map((column) => column.colId)).toEqual(['c0', 'c1']);
  });

  it('slides the center window when the grid scrolls horizontally', () => {
    const window = columnWindow(pinned, 500, 300, 0, 0);
    expect(window.center.map((column) => column.colId)).toEqual(['c3', 'c4', 'c5', 'c6']);
    expect(window.leftSpacer).toBe(300);
  });

  it('adds column overscan on both sides', () => {
    const window = columnWindow(pinned, 500, 300, 1, 0);
    expect(window.center[0]?.colId).toBe('c2');
    expect(window.center.at(-1)?.colId).toBe('c7');
  });

  it('omits hidden columns because they are absent from the sized list', () => {
    const visible = pinned.filter((column) => column.colId !== 'c1');
    const window = columnWindow(visible, 0, 1000, 0, 0);
    expect(window.center.some((column) => column.colId === 'c1')).toBe(false);
  });

  it('recomputes spacers when a column width changes', () => {
    const narrow = columnWindow(center(5, 100), 200, 100, 0, 0);
    const wide = columnWindow(
      center(5, 100).map((column) => (column.colId === 'c0' ? { ...column, width: 250 } : column)),
      200,
      100,
      0,
      0,
    );
    expect(wide.leftSpacer).not.toBe(narrow.leftSpacer);
    expect(wide.totalWidth).toBe(narrow.totalWidth + 150);
  });

  it('keeps pinned columns mounted beside the center window', () => {
    const window = columnWindow(pinned, 1500, 200, 0, 0);
    expect(window.left).toHaveLength(1);
    expect(window.right).toHaveLength(1);
    expect(window.center.every((column) => column.pinned === null)).toBe(true);
  });

  it('reports the full horizontal scroll width, including pins and the selection column', () => {
    const window = columnWindow(pinned, 0, 300, 0, 44);
    expect(window.totalWidth).toBe(44 + 120 + 2000 + 80);
  });

  it('keeps a large column list to the viewport', () => {
    const window = columnWindow(center(200), 0, 400, 2, 0);
    expect(window.renderedCount).toBeLessThan(20);
    expect(window.totalWidth).toBe(20000);
  });
});

describe('resolvedColumnWidth', () => {
  it('uses the default width and honors min and max', () => {
    expect(resolvedColumnWidth({ width: null, minWidth: null, maxWidth: null })).toBe(
      DEFAULT_COLUMN_WIDTH,
    );
    expect(resolvedColumnWidth({ width: 40, minWidth: 80, maxWidth: 240 })).toBe(80);
    expect(resolvedColumnWidth({ width: 400, minWidth: 80, maxWidth: 240 })).toBe(240);
  });
});
