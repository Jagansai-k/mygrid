'use client';

import { MYGRID_CORE_VERSION, MYGRID_LIBRARY_NAME } from '@inno-grid/mygrid-core';
import type { ReactNode } from 'react';
import { reactGridAdapter } from './adapter';
import { MYGRID_REACT_VERSION } from './version';

/** Names match `@inno-grid/mygrid-themes` theme selectors. */
export type MyGridTheme = 'light' | 'dark';

/** Names match `@inno-grid/mygrid-themes` density selectors. */
export type MyGridDensity = 'compact' | 'default' | 'comfortable';

export interface MyGridProps {
  className?: string;
  children?: ReactNode;
  /** Sets `data-mygrid-theme` when the themes stylesheet is loaded. */
  theme?: MyGridTheme;
  /** Sets `data-mygrid-density` when the themes stylesheet is loaded. */
  density?: MyGridDensity;
}

/**
 * Root element for the React adapter.
 *
 * The grid does not render cells yet. This component is the client mount
 * point: it records the adapter on the DOM node and renders `children`.
 * `theme` and `density` only set data attributes. The themes package paints them.
 */
export function MyGrid({ className, children, theme, density }: MyGridProps) {
  return (
    <div
      {...(className === undefined ? {} : { className })}
      {...(theme === undefined ? {} : { 'data-mygrid-theme': theme })}
      {...(density === undefined ? {} : { 'data-mygrid-density': density })}
      data-mygrid={MYGRID_LIBRARY_NAME}
      data-mygrid-adapter={reactGridAdapter.framework}
      data-mygrid-core-version={MYGRID_CORE_VERSION}
      data-mygrid-react-version={MYGRID_REACT_VERSION}
    >
      {children}
    </div>
  );
}
