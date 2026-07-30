export const PER_PAGE = 50;

export function getCurrentPageFromSearchParams(searchParams: URLSearchParams) {
  const currentPage = parseInt(searchParams.get("page") || "1");
  return isNaN(currentPage) ? 1 : currentPage;
}

export function limitRows<T>(rows: T[], currentPage: number) {
  return rows.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);
}
