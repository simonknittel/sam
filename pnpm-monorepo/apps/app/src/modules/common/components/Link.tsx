"use client";

import NextLink from "next/link"; // eslint-disable-line no-restricted-imports
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
 * when the user hovers over the link. The hover upgrades to Next.js' default
 * ("auto") prefetching instead of a full prefetch: our routes are all
 * dynamically rendered, so "auto" only fetches the route tree up to the nearest
 * `loading.tsx` boundary instead of fully server-rendering the target page for
 * every hovered link.
 */
export const Link = (props: Props) => {
  const { prefetch, onMouseEnter, ...rest } = props;

  const [_prefetch, setPrefetch] = useState<Props["prefetch"]>(
    prefetch === undefined ? false : prefetch,
  );

  const _onMouseEnter =
    prefetch === undefined && onMouseEnter === undefined
      ? () => setPrefetch(null)
      : onMouseEnter;

  return (
    <NextLink prefetch={_prefetch} onMouseEnter={_onMouseEnter} {...rest} />
  );
};
