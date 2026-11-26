import { describe, expect, it } from 'vitest';
import { GridError } from '../errors';
import { GRID_STATE_FORMAT_VERSION } from '../format';
import type { GridState, GridStateListener } from '../types';
import { createGridStateManager } from './grid-state-manager';

interface Employee {
  id: number;
  name: string;
}

function emptyState(): GridState<Employee> {
  return {
    rowData: [],
    rowIds: [],
    displayedRowIds: [],
    columnDefs: [],
    columnState: [],
    sortModel: [],
    filterModel: { join: 'and', filters: [] },
    pagination: { enabled: false, page: 0, pageSize: 100, pageSizeOptions: [10, 25, 50, 100] },
    selectedRowIds: [],
    focusedCell: null,
    configuration: {
      formatVersion: GRID_STATE_FORMAT_VERSION,
      caseSensitive: true,
      filterCaseSensitive: true,
      selectionMode: 'multiple',
    },
  };
}

function manager() {
  return createGridStateManager<Employee>(emptyState(), (state) => {
    if (state.selectedRowIds.includes('bad')) {
      throw new GridError('invalid-selection', 'bad selection');
    }
  });
}

describe('grid state manager', () => {
  it('returns the same snapshot until the state changes', () => {
    const store = manager();
    const initial = store.getState();
    let calls = 0;
    store.subscribe(() => {
      calls += 1;
    });

    store.setState({
      ...initial,
      rowData: [...initial.rowData],
      rowIds: [...initial.rowIds],
      displayedRowIds: [...initial.displayedRowIds],
      columnDefs: [...initial.columnDefs],
      columnState: [...initial.columnState],
      sortModel: [...initial.sortModel],
      filterModel: { join: initial.filterModel.join, filters: [...initial.filterModel.filters] },
      selectedRowIds: [...initial.selectedRowIds],
      configuration: {
        formatVersion: initial.configuration.formatVersion,
        caseSensitive: initial.configuration.caseSensitive,
        filterCaseSensitive: initial.configuration.filterCaseSensitive,
        selectionMode: initial.configuration.selectionMode,
      },
    });
    store.updateState((state) => state);

    expect(store.getState()).toBe(initial);
    expect(calls).toBe(0);
  });

  it('notifies subscribers with the previous and next snapshots', () => {
    const store = manager();
    const previous = store.getState();
    const seen: GridState<Employee>[] = [];
    store.subscribe((state, prior) => {
      seen.push(prior, state);
    });

    const next = { ...previous, selectedRowIds: ['1'] };
    store.setState(next);

    expect(seen).toEqual([previous, next]);
    expect(store.getState()).toBe(next);
  });

  it('does not publish a rejected update', () => {
    const store = manager();
    const initial = store.getState();
    let calls = 0;
    store.subscribe(() => {
      calls += 1;
    });

    expect(() => {
      store.setState({ ...initial, selectedRowIds: ['bad'] });
    }).toThrow(/bad selection/);
    expect(() => {
      store.updateState((state) => ({ ...state, selectedRowIds: ['bad'] }));
    }).toThrow(/bad selection/);
    expect(store.getState()).toBe(initial);
    expect(calls).toBe(0);
  });

  it('supports unsubscribe, including removal during notification', () => {
    const store = manager();
    const seen: string[] = [];
    const second: GridStateListener<Employee> = () => {
      seen.push('b');
    };
    const unsubscribeFirst = store.subscribe(() => {
      seen.push('a');
      store.unsubscribe(second);
    });
    store.subscribe(second);
    store.setState({ ...store.getState(), selectedRowIds: ['1'] });
    unsubscribeFirst();
    store.setState({ ...store.getState(), selectedRowIds: ['2'] });

    expect(seen).toEqual(['a']);
  });

  it('continues after a subscriber throws', () => {
    const store = manager();
    const seen: string[] = [];
    store.subscribe(() => {
      seen.push('a');
      throw new Error('a failed');
    });
    store.subscribe(() => {
      seen.push('b');
    });

    expect(() => {
      store.updateState((state) => ({ ...state, selectedRowIds: ['9'] }));
    }).toThrow(/a failed/);
    expect(seen).toEqual(['a', 'b']);
    expect(store.getState().selectedRowIds).toEqual(['9']);
  });

  it('combines subscriber failures', () => {
    const store = manager();
    store.subscribe(() => {
      throw new Error('first');
    });
    store.subscribe(() => {
      throw new Error('second');
    });

    expect(() => {
      store.setState({ ...store.getState(), selectedRowIds: ['3'] });
    }).toThrow(AggregateError);
  });

  it('clears subscribers', () => {
    const store = manager();
    let calls = 0;
    store.subscribe(() => {
      calls += 1;
    });
    store.clear();
    store.setState({ ...store.getState(), selectedRowIds: ['4'] });

    expect(calls).toBe(0);
    expect(store.getState().selectedRowIds).toEqual(['4']);
  });
});
