"use client";

import NextLink from "next/link";
import { useState, type ComponentProps } from "react";

type Props = ComponentProps<typeof NextLink>;

/**
 * This component wraps Next.js' `<Link>` component while overriding its default
 * prefetch behavior.
 *
 * By default, Next.js prefetches pages linked with the `<Link>` component when
 * they enter the viewport. This can lead to unnecessary network requests and
 * increased data usage, especially on pages with many links.
 *
 * This custom `<Link>` component changes the default behavior to only prefetch
 * when the user hovers over the link.
 */
export const Link = (props: Props) => {
  const { prefetch, onMouseEnter, ...rest } = props;

  const [_prefetch, setPrefetch] = useState(
    prefetch === undefined ? false : prefetch,
  );

  const _onMouseEnter =
    prefetch === undefined && onMouseEnter === undefined
      ? () => setPrefetch(true)
      : onMouseEnter;

  return (
    <NextLink prefetch={_prefetch} onMouseEnter={_onMouseEnter} {...rest} />
  );
};
