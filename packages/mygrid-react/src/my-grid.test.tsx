/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MYGRID_CORE_VERSION } from '@inno-grid/mygrid-core';
import { MYGRID_REACT_VERSION, MyGrid } from './index';

describe('MyGrid', () => {
  it('renders a mount point and does not claim to be a grid', () => {
    render(
      <MyGrid className="mount">
        <p>Adapter mounted</p>
      </MyGrid>,
    );

    const paragraph = screen.getByText('Adapter mounted');
    const root = paragraph.parentElement;
    expect(root).not.toBeNull();
    expect(root?.getAttribute('data-mygrid')).toBe('mygrid');
    expect(root?.getAttribute('data-mygrid-adapter')).toBe('react');
    expect(root?.getAttribute('data-mygrid-core-version')).toBe(MYGRID_CORE_VERSION);
    expect(root?.getAttribute('data-mygrid-react-version')).toBe(MYGRID_REACT_VERSION);
    expect(root?.className).toBe('mount');
    expect(root?.getAttribute('role')).toBeNull();
  });

  it('omits the class attribute when className is not set', () => {
    render(
      <MyGrid>
        <p>Plain</p>
      </MyGrid>,
    );

    expect(screen.getByText('Plain').parentElement?.hasAttribute('class')).toBe(false);
  });
});
