import { describe, expect, it } from 'vitest';
import type { GridApi, SelectionChangedEvent } from '../types';
import { GridEventBus } from './event-bus';

interface Employee {
  id: number;
  name: string;
}

function selectionEvent(): SelectionChangedEvent<Employee> {
  return {
    type: 'selectionChanged',
    api: {} as GridApi<Employee>,
    selectedRowIds: Object.freeze(['1']),
  };
}

describe('event bus', () => {
  it('stores one function once and removes it by reference', () => {
    const bus = new GridEventBus<Employee>();
    const seen: string[] = [];
    const listener = (): void => {
      seen.push('a');
    };

    expect(bus.add('selectionChanged', listener)).toBe(true);
    expect(bus.add('selectionChanged', listener)).toBe(false);
    bus.emit(selectionEvent());
    bus.remove('selectionChanged', listener);
    bus.remove('rowDataChanged', listener);
    bus.emit(selectionEvent());

    expect(seen).toEqual(['a']);
  });

  it('skips a listener removed before it runs and still calls the rest', () => {
    const bus = new GridEventBus<Employee>();
    const seen: string[] = [];
    const second = (): void => {
      seen.push('b');
    };
    bus.add('selectionChanged', () => {
      seen.push('a');
      bus.remove('selectionChanged', second);
    });
    bus.add('selectionChanged', second);
    bus.add('selectionChanged', () => {
      seen.push('c');
    });

    bus.emit(selectionEvent());
    expect(seen).toEqual(['a', 'c']);
  });

  it('runs every listener when one throws and freezes the event', () => {
    const bus = new GridEventBus<Employee>();
    const seen: string[] = [];
    bus.add('selectionChanged', (event) => {
      seen.push(event.type);
      expect(Object.isFrozen(event)).toBe(true);
      throw new Error('first');
    });
    bus.add('selectionChanged', () => {
      seen.push('second');
      throw new Error('second');
    });

    const errors = bus.emit(selectionEvent());
    expect(seen).toEqual(['selectionChanged', 'second']);
    expect(errors.map((error) => (error instanceof Error ? error.message : ''))).toEqual([
      'first',
      'second',
    ]);
  });

  it('clears listeners', () => {
    const bus = new GridEventBus<Employee>();
    let calls = 0;
    bus.add('gridReady', () => {
      calls += 1;
    });
    bus.clear();
    bus.emit({ type: 'gridReady', api: {} as GridApi<Employee> });

    expect(calls).toBe(0);
  });
});
