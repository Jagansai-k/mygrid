import { defineGridAdapter } from '@inno-grid/mygrid-core';
import { MYGRID_REACT_VERSION } from './version';

export const reactGridAdapter = defineGridAdapter({
  framework: 'react',
  version: MYGRID_REACT_VERSION,
});
