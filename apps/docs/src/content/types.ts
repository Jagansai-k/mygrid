export type LiveExampleId =
  'employee' | 'sorting' | 'filtering' | 'pagination' | 'selection' | 'dark' | 'large';

export type Block =
  | { readonly kind: 'p'; readonly text: string }
  | { readonly kind: 'h2'; readonly id: string; readonly text: string }
  | { readonly kind: 'h3'; readonly id: string; readonly text: string }
  | { readonly kind: 'list'; readonly items: readonly string[] }
  | {
      readonly kind: 'code';
      readonly language: 'ts' | 'tsx' | 'bash' | 'css';
      readonly code: string;
    }
  | {
      readonly kind: 'table';
      readonly headers: readonly string[];
      readonly rows: readonly (readonly string[])[];
    }
  | { readonly kind: 'note'; readonly text: string }
  | { readonly kind: 'live'; readonly id: LiveExampleId };

export interface DocPage {
  readonly path: string;
  readonly title: string;
  readonly description: string;
  readonly section: string;
  readonly blocks: readonly Block[];
}

export interface NavGroup {
  readonly label: string;
  readonly pages: readonly { readonly path: string; readonly label: string }[];
}

export function textOf(block: Block): string {
  switch (block.kind) {
    case 'p':
    case 'note':
    case 'h2':
    case 'h3':
      return block.text;
    case 'list':
      return block.items.join(' ');
    case 'code':
      return block.code;
    case 'table':
      return [...block.headers, ...block.rows.flat()].join(' ');
    case 'live':
      return block.id;
    default: {
      const unreachable: never = block;
      return unreachable;
    }
  }
}
