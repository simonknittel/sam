import type { StaticImageData } from "next/image";

/**
 * Next.js deliberately types `*.svg` imports as `any` to stay compatible
 * with svgr-style setups. This app imports SVGs as static assets, so the
 * imported value actually is a `StaticImageData` — this helper gives it
 * that type without scattering assertions across call sites.
 */
export const svgToStaticImageData = (svgImport: unknown) =>
  svgImport as StaticImageData;
