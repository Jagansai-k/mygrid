import type { DocPage, NavGroup } from './types';
import { textOf } from './types';
import { guidePages } from './guides';
import { referencePages } from './reference';
import { startPages } from './start';

export const pages: readonly DocPage[] = [...startPages, ...guidePages, ...referencePages];

export const navigation: readonly NavGroup[] = [
  {
    label: 'Start',
    pages: [
      { path: '/', label: 'Introduction' },
      { path: '/installation', label: 'Installation' },
      { path: '/getting-started', label: 'Getting started' },
      { path: '/nextjs', label: 'Next.js' },
      { path: '/concepts', label: 'Core concepts' },
    ],
  },
  {
    label: 'Guides',
    pages: [
      { path: '/guides/sorting', label: 'Sorting' },
      { path: '/guides/filtering', label: 'Filtering' },
      { path: '/guides/pagination', label: 'Pagination' },
      { path: '/guides/selection', label: 'Selection' },
      { path: '/guides/columns', label: 'Columns' },
      { path: '/guides/virtualization', label: 'Virtualization' },
      { path: '/guides/themes', label: 'Themes' },
    ],
  },
  {
    label: 'API',
    pages: [
      { path: '/api', label: 'Overview' },
      { path: '/api/create-grid', label: 'createGrid' },
      { path: '/api/grid-api', label: 'GridApi' },
      { path: '/api/options', label: 'GridOptions' },
      { path: '/api/columns', label: 'Columns' },
      { path: '/api/rows', label: 'Rows' },
      { path: '/api/state', label: 'State' },
      { path: '/api/sorting', label: 'Sort model' },
      { path: '/api/filtering', label: 'Filter model' },
      { path: '/api/pagination', label: 'Pagination' },
      { path: '/api/selection', label: 'Selection' },
      { path: '/api/react', label: 'React' },
      { path: '/api/events', label: 'Events' },
      { path: '/api/themes', label: 'Themes' },
    ],
  },
  {
    label: 'Help',
    pages: [
      { path: '/examples', label: 'Examples' },
      { path: '/troubleshooting', label: 'Troubleshooting' },
      { path: '/roadmap', label: 'v1 and v2' },
    ],
  },
];

const byPath = new Map(pages.map((page) => [page.path, page]));

export function pageForPath(path: string): DocPage | undefined {
  return byPath.get(path);
}

export function searchPages(query: string): readonly DocPage[] {
  const needle = query.trim().toLowerCase();
  if (needle.length < 2) {
    return [];
  }
  return pages
    .map((page) => ({ page, score: scorePage(page, needle) }))
    .filter((item) => item.score > 0)
    .sort(
      (left, right) => right.score - left.score || left.page.title.localeCompare(right.page.title),
    )
    .slice(0, 8)
    .map((item) => item.page);
}

function scorePage(page: DocPage, needle: string): number {
  const title = page.title.toLowerCase();
  if (title === needle) {
    return 100;
  }
  if (title.includes(needle)) {
    return 50;
  }
  if (page.description.toLowerCase().includes(needle)) {
    return 20;
  }
  return searchable(page).includes(needle) ? 10 : 0;
}

function searchable(page: DocPage): string {
  return [page.title, page.description, ...page.blocks.map(textOf)].join('\n').toLowerCase();
}

export const sitePaths: readonly string[] = pages.map((page) => page.path);
