import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import dts from 'vite-plugin-dts';
import { themeEntryFiles, themeSourceFiles } from './src/theme-files.ts';

function emitThemeStylesheets(): Plugin {
  const directory = resolve(import.meta.dirname, 'src/css');
  const parts = themeSourceFiles.map((name) => ({
    name,
    source: readFileSync(resolve(directory, name), 'utf8'),
  }));
  const theme = parts.map((part) => part.source).join('\n');
  const published = new Set<string>(themeEntryFiles);

  return {
    name: 'emit-theme-stylesheets',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'theme.css',
        source: theme,
      });
      for (const part of parts) {
        if (!published.has(part.name)) {
          continue;
        }
        this.emitFile({
          type: 'asset',
          fileName: part.name,
          source: part.source,
        });
      }
    },
  };
}

export default defineConfig({
  plugins: [
    emitThemeStylesheets(),
    dts({
      include: ['src'],
      exclude: ['src/**/*.test.ts', 'src/theme-files.ts'],
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
