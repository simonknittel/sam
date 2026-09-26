const HTML_ENTITIES: Readonly<Record<string, string>> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/**
 * Makes a text safe to put into an HTML string, as element content or as a
 * quoted attribute value. The browser then shows the text as it is.
 */
export const escapeHtml = (text: string) =>
  text.replace(/[&<>"']/g, (character) => HTML_ENTITIES[character]);
