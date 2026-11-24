import { getImageProps } from "next/image";

export interface OptimizedImageProps {
  readonly src: string;
  readonly srcSet: string;
  readonly sizes: string;
}

/**
 * For renderers that cannot use next/image itself and must emit identical
 * markup (the wiki editor's image node view and the wiki static renderer).
 * Computed through getImageProps, so the URLs always match what the optimizer
 * accepts.
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
