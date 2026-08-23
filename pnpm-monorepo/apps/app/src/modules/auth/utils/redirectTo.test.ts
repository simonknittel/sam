import { describe, expect, it } from "vitest";
import { validateRedirectTo } from "./redirectTo";

describe("validateRedirectTo", () => {
  it("accepts a path into /app", () => {
    expect(validateRedirectTo("/app")).toBe("/app");
    expect(validateRedirectTo("/app/events/42")).toBe("/app/events/42");
  });

  it("keeps the search params of the target", () => {
    expect(validateRedirectTo("/app/spynet?search=test&page=2")).toBe(
      "/app/spynet?search=test&page=2",
    );
  });

  it("removes the hash of the target", () => {
    expect(validateRedirectTo("/app/documents#section")).toBe("/app/documents");
  });

  it("rejects an empty or missing value", () => {
    expect(validateRedirectTo(null)).toBeNull();
    expect(validateRedirectTo("")).toBeNull();
  });

  it("rejects an absolute URL to a different origin", () => {
    expect(validateRedirectTo("https://evil.example.com/app")).toBeNull();
    expect(validateRedirectTo("http://evil.example.com/app")).toBeNull();
  });

  it("rejects a protocol-relative URL", () => {
    expect(validateRedirectTo("//evil.example.com/app")).toBeNull();
    expect(validateRedirectTo("/\\evil.example.com/app")).toBeNull();
    expect(validateRedirectTo("\\\\evil.example.com/app")).toBeNull();
  });

  it("rejects a URL with a scheme", () => {
    expect(validateRedirectTo("javascript:alert(1)")).toBeNull();
    expect(validateRedirectTo("mailto:someone@example.com")).toBeNull();
  });

  it("rejects a path outside of /app", () => {
    expect(validateRedirectTo("/clearance")).toBeNull();
    expect(validateRedirectTo("/api/auth/signout")).toBeNull();
  });

  it("rejects a path that only starts with the characters of /app", () => {
    expect(validateRedirectTo("/application")).toBeNull();
  });

  it("rejects a path that leaves /app through traversal segments", () => {
    expect(validateRedirectTo("/app/../api/auth/signout")).toBeNull();
    expect(validateRedirectTo("/app/..")).toBeNull();
  });
});
