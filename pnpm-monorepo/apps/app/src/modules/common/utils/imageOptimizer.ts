import { getImageProps } from "next/image";

export interface OptimizedImageProps {
  readonly src: string;
  readonly srcSet: string;
  readonly sizes: string;
}

/**
 * The src/srcset/sizes triple next/image would emit for a remote image,
 * for renderers that cannot use the component itself and must emit
 * identical markup (the wiki editor's image node view and the wiki static
 * renderer). Computed through next/image's own getImageProps, so the URLs
 * always match what the optimizer accepts — the width allowlist and
 * default quality follow the app's image config by construction.
 */
export const getOptimizedImageProps = (
  sourceUrl: string,
  intrinsicWidth: number,
  intrinsicHeight: number,
  sizes: string,
): OptimizedImageProps => {
  const { props } = getImageProps({
    src: sourceUrl,
    width: intrinsicWidth,
    height: intrinsicHeight,
    alt: "",
    sizes,
  });

  return {
    src: props.src,
    srcSet: props.srcSet ?? "",
    sizes: props.sizes ?? sizes,
  };
};
