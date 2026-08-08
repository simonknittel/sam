/**
 * Mirror of the Next.js image optimizer's default width allowlist. Pinned
 * explicitly in next.config.ts (`images.deviceSizes`/`images.imageSizes`)
 * so the hand-built srcsets below can never request a width the optimizer
 * rejects, even if a Next.js upgrade changes the defaults.
 */
export const IMAGE_OPTIMIZER_DEVICE_SIZES: readonly number[] = [
  640, 750, 828, 1080, 1200, 1920, 2048, 3840,
];
export const IMAGE_OPTIMIZER_IMAGE_SIZES: readonly number[] = [
  16, 32, 48, 64, 96, 128, 256, 384,
];

/** Must be listed in next.config.ts `images.qualities` */
const IMAGE_OPTIMIZER_QUALITY = 75;

const ALL_WIDTHS = [
  ...IMAGE_OPTIMIZER_IMAGE_SIZES,
  ...IMAGE_OPTIMIZER_DEVICE_SIZES,
].sort((first, second) => first - second);

export interface OptimizedImageProps {
  readonly src: string;
  readonly srcSet: string;
  readonly sizes: string;
}

/**
 * Builds the src/srcset/sizes triple next/image would emit for a remote
 * image, for places that render an `img` outside React's reach (the wiki
 * editor's image node view) or need identical markup with those (the wiki
 * static renderer). `displayWidthPx` is the width the image renders at on
 * a large viewport; it bounds which srcset candidate the browser fetches.
 */
export const getOptimizedImageProps = (
  sourceUrl: string,
  displayWidthPx: number,
): OptimizedImageProps => {
  const optimizedUrl = (width: number) =>
    `/_next/image?url=${encodeURIComponent(sourceUrl)}&w=${width}&q=${IMAGE_OPTIMIZER_QUALITY}`;

  return {
    src: optimizedUrl(Math.max(...ALL_WIDTHS)),
    srcSet: ALL_WIDTHS.map(
      (width) => `${optimizedUrl(width)} ${width}w`,
    ).join(", "),
    sizes: `min(100vw, ${displayWidthPx}px)`,
  };
};
