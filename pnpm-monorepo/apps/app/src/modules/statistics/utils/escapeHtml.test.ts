import { describe, expect, test } from "vitest";
import { escapeHtml } from "./escapeHtml";

describe("escapeHtml", () => {
  test("keeps a text without markup characters", () => {
    expect(escapeHtml("Polaris (Rev. 2)")).toBe("Polaris (Rev. 2)");
  });

  test("escapes all markup characters", () => {
    expect(escapeHtml(`<b class="x" title='y'>A & B</b>`)).toBe(
      "&lt;b class=&quot;x&quot; title=&#39;y&#39;&gt;A &amp; B&lt;/b&gt;",
    );
  });

  test("makes a script tag and an event handler inert", () => {
    const html = escapeHtml(
      `<img src=x onerror="alert(1)"><script>alert(2)</script>`,
    );

    expect(html).not.toContain("<");
    expect(html).not.toContain(">");
    expect(html).not.toContain('"');
  });

  test("escapes an entity again, thus the browser shows it as text", () => {
    expect(escapeHtml("&lt;")).toBe("&amp;lt;");
  });
});
