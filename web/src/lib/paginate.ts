export const PAGE_SIZE = 12

export function pageCount(items: number) {
  return Math.max(1, Math.ceil(items / PAGE_SIZE))
}

export function pageSlice<T>(items: T[], page: number) {
  return items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
}
