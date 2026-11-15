import { describe, expect, it } from "vitest";
import { formatUserAgent } from "./formatUserAgent";

describe("formatUserAgent", () => {
  it("condenses a desktop user agent to browser and operating system", () => {
    expect(
      formatUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
      ),
    ).toBe("Chrome 141 · Windows 10");
  });

  it("includes the device of a mobile user agent", () => {
    expect(
      formatUserAgent(
        "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36",
      ),
    ).toBe("Mobile Chrome 141 · Android 14 · Google Pixel 8");
  });

  it("returns null for sessions without a recorded user agent", () => {
    expect(formatUserAgent(null)).toBeNull();
  });

  it("returns null for a user agent nothing can be read from", () => {
    expect(formatUserAgent("---")).toBeNull();
  });
});
