"use client";

import NextLink from "next/link"; // eslint-disable-line no-restricted-imports
import { useState, type ComponentProps } from "react";

type Props = ComponentProps<typeof NextLink>;

/**
 * Prefetches only on hover, and with the default ("auto") prefetching instead
 * of a full prefetch: our routes are all dynamically rendered, so "auto" only
 * fetches the route tree up to the nearest `loading.tsx` boundary instead of
 * fully server-rendering the target page for every hovered link.
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
