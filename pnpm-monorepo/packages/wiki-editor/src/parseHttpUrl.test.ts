import { describe, expect, test } from "vitest";
import { parseHttpUrl } from "./helpers.js";

describe("parseHttpUrl", () => {
  test.each(["https://example.com/page?query=1", "http://localhost:3000/"])(
    "parses %s",
    (value) => {
      expect(parseHttpUrl(value)?.href).toBe(value);
    },
  );

  test.each([
    "javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "mailto:someone@example.com",
    "www.example.com",
    "not a url",
    "",
  ])("rejects %s", (value) => {
    expect(parseHttpUrl(value)).toBeNull();
  });
});
