/**
 * Sorts strings, numbers and dates ascending and puts null values last.
 */
export function sortAscWithAndNullLast(
  a?: string | number | Date | null,
  b?: string | number | Date | null,
) {
  if (a == null && b == null) {
    return 0;
  } else if (a == null) {
    return 1;
  } else if (b == null) {
    return -1;
  } else {
    if (typeof a === "number" && typeof b === "number") {
      return a - b;
    } else if (typeof a === "string" && typeof b === "string") {
      return a.localeCompare(b);
    } else if (a instanceof Date && b instanceof Date) {
      return a.getTime() - b.getTime();
    }

    return 0;
  }
}

/**
 * Sorts strings, numbers and dates descending and puts null values last.
 */
export function sortDescAndNullLast(
  a?: string | number | Date | null,
  b?: string | number | Date | null,
) {
  if (a == null && b == null) {
    return 0;
  } else if (a == null) {
    return 1;
  } else if (b == null) {
    return -1;
  } else {
    if (typeof a === "number" && typeof b === "number") {
      return b - a;
    } else if (typeof a === "string" && typeof b === "string") {
      return b.localeCompare(a);
    } else if (a instanceof Date && b instanceof Date) {
      return b.getTime() - a.getTime();
    }

    return 0;
  }
}
