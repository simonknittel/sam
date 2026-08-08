import { describe, expect, test } from "vitest";
import { getOptimizedImageProps } from "./imageOptimizer";

const SOURCE = "https://files.example.com/cm123";

/**
 * Same shape wikiImageRendering builds. Every `100vw` sits inside a
 * function, deliberately: next/image trims the srcset to device sizes when
 * the sizes hint contains a bare `NNvw` token, which would drop the small
 * candidates that small images resolve to.
 */
const SIZES =
  "(min-width: 768px) min(calc(100vw - 368px), 500px), min(100vw, 500px)";

/**
 * Outside a Next.js build getImageProps falls back to the default image
 * config, which is also what the app deploys with (next.config.ts does not
 * override deviceSizes/imageSizes) — so these assertions describe the
 * production URLs.
 */
describe("getOptimizedImageProps", () => {
  test("builds optimizer URLs over the full width allowlist", () => {
    const props = getOptimizedImageProps(SOURCE, 500, 200, SIZES);

    const candidates = props.srcSet.split(", ");
    expect(candidates).toHaveLength(15);
    expect(candidates[0]).toBe(
      `/_next/image?url=${encodeURIComponent(SOURCE)}&w=32&q=75 32w`,
    );
    expect(candidates.at(-1)).toBe(
      `/_next/image?url=${encodeURIComponent(SOURCE)}&w=3840&q=75 3840w`,
    );
  });

  test("uses the largest candidate as the fallback src and passes sizes through", () => {
    const props = getOptimizedImageProps(SOURCE, 500, 200, SIZES);

    expect(props.src).toBe(
      `/_next/image?url=${encodeURIComponent(SOURCE)}&w=3840&q=75`,
    );
    expect(props.sizes).toBe(SIZES);
  });
});
