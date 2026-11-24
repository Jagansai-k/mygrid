'use client';

import { MYGRID_CORE_VERSION, MYGRID_LIBRARY_NAME } from '@inno-grid/mygrid-core';
import type { ReactNode } from 'react';
import { reactGridAdapter } from './adapter';
import { MYGRID_REACT_VERSION } from './version';

export interface MyGridProps {
  className?: string;
  children?: ReactNode;
}

/**
 * Root element for the React adapter.
 *
 * The grid does not render cells yet. This component is the client mount
 * point: it records the adapter on the DOM node and renders `children`.
 */
export function MyGrid({ className, children }: MyGridProps) {
  return (
    <div
      {...(className === undefined ? {} : { className })}
      data-mygrid={MYGRID_LIBRARY_NAME}
      data-mygrid-adapter={reactGridAdapter.framework}
      data-mygrid-core-version={MYGRID_CORE_VERSION}
      data-mygrid-react-version={MYGRID_REACT_VERSION}
    >
      {children}
    </div>
  );
}
