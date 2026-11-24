import type { NextConfig } from 'next';

const config: NextConfig = {
  transpilePackages: [
    '@inno-grid/mygrid-core',
    '@inno-grid/mygrid-react',
    '@inno-grid/mygrid-themes',
  ],
};

export default config;
