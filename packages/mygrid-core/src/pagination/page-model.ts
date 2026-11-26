import { GridError } from '../errors';
import { assertExactKeys, assertKnownKeys, isRecord, isUnknownArray } from '../guards';
import type { PaginationModel } from '../types';

/** Default rows per page. Used when pagination options omit `pageSize` and the size is allowed. */
export const DEFAULT_PAGE_SIZE = 100;

/** Default choices for {@link PaginationModel.pageSize}. */
export const DEFAULT_PAGE_SIZE_OPTIONS: readonly number[] = Object.freeze([10, 25, 50, 100]);

/** Pagination is off, the page index is 0, and the stored page size is {@link DEFAULT_PAGE_SIZE}. */
export const DEFAULT_PAGINATION: PaginationModel = Object.freeze({
  enabled: false,
  page: 0,
  pageSize: DEFAULT_PAGE_SIZE,
  pageSizeOptions: DEFAULT_PAGE_SIZE_OPTIONS,
});

/**
 * Number of pages for the filtered row count.
 * An empty filtered set has 0 pages. A disabled pager has one page when any row remains.
 */
export function pageCount(filteredCount: number, model: PaginationModel): number {
  if (filteredCount === 0) {
    return 0;
  }
  if (!model.enabled) {
    return 1;
  }
  return Math.ceil(filteredCount / model.pageSize);
}

/** Start index and length of the current page inside the filtered, sorted row list. */
export function pageWindow(
  filteredCount: number,
  model: PaginationModel,
): { readonly start: number; readonly count: number } {
  if (!model.enabled || filteredCount === 0) {
    return { start: 0, count: model.enabled ? 0 : filteredCount };
  }
  const start = model.page * model.pageSize;
  return {
    start,
    count: Math.max(0, Math.min(model.pageSize, filteredCount - start)),
  };
}

/**
 * Moves the page index back onto a valid page after the filtered set changes.
 * A disabled pager stays on page 0. The same model is returned when the index is already valid.
 */
export function clampPagination(model: PaginationModel, filteredCount: number): PaginationModel {
  const page = clampedPage(model, filteredCount);
  if (page === model.page) {
    return model;
  }
  return Object.freeze({
    enabled: model.enabled,
    page,
    pageSize: model.pageSize,
    pageSizeOptions: model.pageSizeOptions,
  });
}

/** Rejects a page index the current filtered set cannot show. Does not change the model. */
export function assertPageInRange(
  page: number,
  filteredCount: number,
  model: PaginationModel,
): void {
  if (typeof page !== 'number' || !Number.isInteger(page) || page < 0) {
    throw new GridError('invalid-state', 'Page index must be an integer of 0 or greater.');
  }
  if (!model.enabled && page !== 0) {
    throw new GridError('invalid-state', 'Pagination is disabled. The only page index is 0.');
  }
  const count = pageCount(filteredCount, model);
  if (count === 0) {
    if (page !== 0) {
      throw new GridError(
        'invalid-state',
        'Page index 0 is the only index when there are no pages.',
      );
    }
    return;
  }
  if (page >= count) {
    throw new GridError('invalid-state', `Page index ${page} is past the last page ${count - 1}.`);
  }
}

export function samePagination(left: PaginationModel, right: PaginationModel): boolean {
  if (left === right) {
    return true;
  }
  if (
    left.enabled !== right.enabled ||
    left.page !== right.page ||
    left.pageSize !== right.pageSize
  ) {
    return false;
  }
  if (left.pageSizeOptions.length !== right.pageSizeOptions.length) {
    return false;
  }
  for (let index = 0; index < left.pageSizeOptions.length; index += 1) {
    if (left.pageSizeOptions[index] !== right.pageSizeOptions[index]) {
      return false;
    }
  }
  return true;
}

/** Reads `GridOptions.pagination`. Omitted fields use the defaults. */
export function paginationFromOptions(value: unknown): PaginationModel {
  if (!isRecord(value)) {
    throw new GridError('invalid-state', 'Pagination options must be an object.');
  }
  assertKnownKeys(
    value,
    ['enabled', 'page', 'pageSize', 'pageSizeOptions'],
    'Pagination options',
    'invalid-state',
  );
  const enabled = readFlag(value, 'enabled', false);
  const pageSizeOptions = Object.hasOwn(value, 'pageSizeOptions')
    ? readPageSizeOptions(value.pageSizeOptions)
    : DEFAULT_PAGE_SIZE_OPTIONS;
  const pageSize = Object.hasOwn(value, 'pageSize')
    ? readPageSize(value.pageSize)
    : defaultPageSize(pageSizeOptions);
  if (!pageSizeOptions.includes(pageSize)) {
    throw new GridError(
      'invalid-state',
      `Page size ${pageSize} is not one of the page size options.`,
    );
  }
  const page = Object.hasOwn(value, 'page') ? readPageIndex(value.page) : 0;
  return Object.freeze({ enabled, page, pageSize, pageSizeOptions });
}

/**
 * Reads pagination from a version 1 snapshot.
 * A missing value is the disabled default, so older snapshots still load.
 */
export function parseStoredPagination(value: unknown): PaginationModel {
  if (value === undefined) {
    return DEFAULT_PAGINATION;
  }
  if (!isRecord(value)) {
    throw new GridError('invalid-state', 'Pagination state must be an object.');
  }
  assertExactKeys(
    value,
    ['enabled', 'page', 'pageSize', 'pageSizeOptions'],
    'Pagination state',
    'invalid-state',
  );
  if (typeof value.enabled !== 'boolean') {
    throw new GridError('invalid-state', 'Pagination enabled must be a boolean.');
  }
  const pageSizeOptions = readPageSizeOptions(value.pageSizeOptions);
  const pageSize = readPageSize(value.pageSize);
  if (!pageSizeOptions.includes(pageSize)) {
    throw new GridError(
      'invalid-state',
      `Page size ${pageSize} is not one of the page size options.`,
    );
  }
  return Object.freeze({
    enabled: value.enabled,
    page: readPageIndex(value.page),
    pageSize,
    pageSizeOptions,
  });
}

/** Replaces the page size and keeps the page index inside the new page list. */
export function paginationWithPageSize(
  model: PaginationModel,
  pageSize: number,
  filteredCount: number,
): PaginationModel {
  const size = readPageSize(pageSize);
  if (!model.pageSizeOptions.includes(size)) {
    throw new GridError('invalid-state', `Page size ${size} is not one of the page size options.`);
  }
  return clampPagination(
    Object.freeze({
      enabled: model.enabled,
      page: model.page,
      pageSize: size,
      pageSizeOptions: model.pageSizeOptions,
    }),
    filteredCount,
  );
}

/** Replaces the zero-based page index after checking it against the filtered set. */
export function paginationWithPage(
  model: PaginationModel,
  page: number,
  filteredCount: number,
): PaginationModel {
  assertPageInRange(page, filteredCount, model);
  if (page === model.page) {
    return model;
  }
  return Object.freeze({
    enabled: model.enabled,
    page,
    pageSize: model.pageSize,
    pageSizeOptions: model.pageSizeOptions,
  });
}

function clampedPage(model: PaginationModel, filteredCount: number): number {
  if (!model.enabled) {
    return 0;
  }
  const count = pageCount(filteredCount, model);
  if (count === 0) {
    return 0;
  }
  return Math.min(model.page, count - 1);
}

function defaultPageSize(options: readonly number[]): number {
  if (options.includes(DEFAULT_PAGE_SIZE)) {
    return DEFAULT_PAGE_SIZE;
  }
  const first = options[0];
  if (first === undefined) {
    throw new GridError('invalid-state', 'Page size options must include one size.');
  }
  return first;
}

function readPageSizeOptions(value: unknown): readonly number[] {
  if (!isUnknownArray(value)) {
    throw new GridError('invalid-state', 'Page size options must be an array.');
  }
  if (value.length === 0) {
    throw new GridError('invalid-state', 'Page size options must include one size.');
  }
  const seen = new Set<number>();
  const options: number[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const size = value[index];
    if (!isPageSize(size)) {
      throw new GridError('invalid-state', `Page size option ${index} must be a positive integer.`);
    }
    if (seen.has(size)) {
      throw new GridError('invalid-state', `Duplicate page size option ${size}.`);
    }
    seen.add(size);
    options.push(size);
  }
  return Object.freeze(options);
}

function readPageSize(value: unknown): number {
  if (!isPageSize(value)) {
    throw new GridError('invalid-state', 'Page size must be a positive integer.');
  }
  return value;
}

function readPageIndex(value: unknown): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    throw new GridError('invalid-state', 'Page index must be an integer of 0 or greater.');
  }
  return value;
}

function readFlag(value: Record<string, unknown>, key: string, fallback: boolean): boolean {
  if (!Object.hasOwn(value, key)) {
    return fallback;
  }
  const flag = value[key];
  if (typeof flag !== 'boolean') {
    throw new GridError('invalid-state', `Pagination ${key} must be a boolean.`);
  }
  return flag;
}

function isPageSize(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}
