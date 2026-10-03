/**
 * Parses an absolute http or https URL. Returns null for a value that is not
 * a URL and for all other protocols (for example `javascript:`).
 *
 * This code also runs in the browser. `URL.parse()` is Baseline "widely
 * available" only from 2027-03-16, thus the function uses `new URL()`.
 */
export const parseHttpUrl = (value: string): URL | null => {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }

  return url.protocol === "http:" || url.protocol === "https:" ? url : null;
};
