import { createParser, parseAsInteger } from "nuqs/server";

export const PER_PAGE = 50;

/**
 * The `page` search parameter of the tables with `Pagination`. Only safe
 * integers from 1 are pages, all other values give the first page. A page
 * after the last one stays: the table shows no rows on it.
 */
export const pageParser = createParser({
  parse: (value) => {
    const page = parseAsInteger.parse(value);
    return page !== null && Number.isSafeInteger(page) && page >= 1
      ? page
      : null;
  },
  serialize: parseAsInteger.serialize,
}).withDefault(1);

export function limitRows<T>(rows: T[], currentPage: number) {
  return rows.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);
}
