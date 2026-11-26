import type { ReactNode } from 'react';

const KEYWORDS = new Set([
  'import',
  'export',
  'from',
  'const',
  'let',
  'function',
  'return',
  'type',
  'interface',
  'as',
  'if',
  'true',
  'false',
  'null',
  'undefined',
  'readonly',
  'new',
]);

/** A small highlighter for the documentation samples. It is not a language parser. */
export function HighlightedCode({ code }: { readonly code: string }): ReactNode {
  const nodes: ReactNode[] = [];
  const pattern =
    /\/\/.*|\/\*[\s\S]*?\*\/|`(?:\\.|[^`])*`|'(?:\\.|[^'])*'|"(?:\\.|[^"])*"|\b\d+(?:\.\d+)?\b|\b[A-Za-z_][A-Za-z0-9_]*\b/g;
  let cursor = 0;
  for (const match of code.matchAll(pattern)) {
    const token = match[0];
    const index = match.index;
    if (index > cursor) {
      nodes.push(code.slice(cursor, index));
    }
    const kind = tokenClass(token);
    nodes.push(
      kind === '' ? (
        token
      ) : (
        <span key={`${String(index)}-${token.slice(0, 12)}`} className={kind}>
          {token}
        </span>
      ),
    );
    cursor = index + token.length;
  }
  if (cursor < code.length) {
    nodes.push(code.slice(cursor));
  }
  return nodes;
}

function tokenClass(token: string): string {
  if (token.startsWith('//') || token.startsWith('/*')) {
    return 'token-comment';
  }
  if (token.startsWith("'") || token.startsWith('"') || token.startsWith('`')) {
    return 'token-string';
  }
  if (/^\d/.test(token)) {
    return 'token-number';
  }
  if (KEYWORDS.has(token)) {
    return 'token-keyword';
  }
  return '';
}
