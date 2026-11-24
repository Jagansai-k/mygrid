import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import dts from 'vite-plugin-dts';

function emitThemeStylesheet(): Plugin {
  const source = readFileSync(resolve(import.meta.dirname, 'src/theme.css'), 'utf8');
  return {
    name: 'emit-theme-stylesheet',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'theme.css',
        source,
      });
    },
  };
}

export default defineConfig({
  plugins: [
    emitThemeStylesheet(),
    dts({
      include: ['src'],
      exclude: ['src/**/*.test.ts'],
      tsconfigPath: './tsconfig.build.json',
    }),
  ],
  build: {
    lib: {
      entry: resolve(import.meta.dirname, 'src/index.ts'),
      formats: ['es'],
      fileName: 'index',
    },
    sourcemap: true,
    emptyOutDir: true,
    minify: false,
    target: 'es2023',
  },
});
