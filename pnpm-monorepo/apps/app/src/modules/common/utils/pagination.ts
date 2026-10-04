import { parseAsInteger } from "nuqs/server";

export const PER_PAGE = 50;

/** The `page` search parameter of the tables with `Pagination` */
export const pageParser = parseAsInteger.withDefault(1);

export function limitRows<T>(rows: T[], currentPage: number) {
  return rows.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);
}
