import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const entry = join(dirname(fileURLToPath(import.meta.url)), '../dist/index.js');
const source = readFileSync(entry, 'utf8');
const prologue = source.slice(0, 200);

if (!prologue.includes("'use client'") && !prologue.includes('"use client"')) {
  console.error(`React entry is missing the client directive: ${entry}`);
  process.exit(1);
}
