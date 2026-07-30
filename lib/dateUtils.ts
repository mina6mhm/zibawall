// lib/dateUtils.ts

export const toDateOnlyAnchor = (d: Date): Date =>
  new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));

export const toDateOnlyString = (d: Date): string =>
  toDateOnlyAnchor(d).toISOString().slice(0, 10);