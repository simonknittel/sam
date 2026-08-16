/**
 * For the rare cases where HTML has to be assembled as a string (e.g. chart
 * tooltip formatters rendered via innerHTML) instead of through React.
 */
export const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
