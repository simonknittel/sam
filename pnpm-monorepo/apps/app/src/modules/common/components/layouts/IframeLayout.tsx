"use client";

import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import { useIsHydrated } from "@/modules/common/utils/useIsHydrated";
import type { ComponentProps } from "react";

interface Props {
  readonly src: string;
  readonly title: string;
  readonly iframeProps?: Omit<ComponentProps<"iframe">, "src" | "title">;
}

export const IframeLayout = ({ src, title, iframeProps }: Props) => {
  /**
   * On a full page load, the page streams in after the shell (the Suspense
   * boundary of `app/loading.tsx`). React then moves the streamed content
   * into its place, and the move of an iframe stops its first navigation
   * and starts a second one. Thus the iframe renders only after the
   * hydration, and the frame loads one time.
   */
  const isHydrated = useIsHydrated();

  return (
    <div className="relative h-[calc(100dvh-64px-48px)] lg:h-[calc(100dvh-112px)]">
      {/*
       * `scheme-normal`: with the dark scheme of the app, the browser paints
       * an embedded light page without a background on an opaque white canvas.
       */}
      {isHydrated && (
        <iframe
          src={src}
          className="relative z-10 block size-full scheme-normal"
          title={title}
          {...iframeProps}
        />
      )}

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <AsciiSpinner className="text-5xl text-neutral-500" />
      </div>
    </div>
  );
};
