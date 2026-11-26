import { useCallback, useEffect, useState } from 'react';

export interface ScrollBox {
  readonly top: number;
  readonly left: number;
  readonly width: number;
  readonly height: number;
}

const EMPTY_BOX: ScrollBox = { top: 0, left: 0, width: 0, height: 0 };

/**
 * Tracks the scroll container's position and size.
 * Scroll and resize notifications are folded into one animation frame.
 */
export function useScrollBox(): {
  readonly setNode: (node: HTMLDivElement | null) => void;
  readonly box: ScrollBox;
  readonly scrollToTop: () => void;
} {
  const [node, setNode] = useState<HTMLDivElement | null>(null);
  const [box, setBox] = useState<ScrollBox>(EMPTY_BOX);

  const scrollToTop = useCallback((): void => {
    setNode((current) => {
      if (current !== null) {
        current.scrollTop = 0;
      }
      return current;
    });
    setBox((current) => (current.top === 0 ? current : { ...current, top: 0 }));
  }, []);

  useEffect(() => {
    if (node === null) {
      return;
    }
    let frame = 0;
    let alive = true;
    const read = (): void => {
      if (!alive) {
        return;
      }
      const next: ScrollBox = {
        top: node.scrollTop,
        left: node.scrollLeft,
        width: node.clientWidth,
        height: node.clientHeight,
      };
      setBox((current) =>
        current.top === next.top &&
        current.left === next.left &&
        current.width === next.width &&
        current.height === next.height
          ? current
          : next,
      );
    };
    const schedule = (): void => {
      if (frame !== 0) {
        return;
      }
      frame = requestAnimationFrame(() => {
        frame = 0;
        read();
      });
    };
    read();
    node.addEventListener('scroll', schedule, { passive: true });
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(schedule);
    observer?.observe(node);
    return () => {
      alive = false;
      if (frame !== 0) {
        cancelAnimationFrame(frame);
      }
      node.removeEventListener('scroll', schedule);
      observer?.disconnect();
    };
  }, [node]);

  return { setNode, box, scrollToTop };
}
