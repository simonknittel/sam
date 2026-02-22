"use client";

import clsx from "clsx";
import { useState, type MouseEventHandler, type ReactNode } from "react";

interface Props {
  readonly className?: string;
  readonly url: string;
  readonly children: ReactNode;
  readonly level?: 1 | 2 | 3;
}

export const SectionHeading = ({
  className,
  url,
  children,
  level = 2,
}: Props) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const handleClick: MouseEventHandler<HTMLAnchorElement> = (e) => {
    e.preventDefault();

    navigator.permissions
      // @ts-expect-error: clipboard-write is not standard
      .query({ name: "clipboard-write" })
      .then((result) => {
        if (result.state !== "granted" && result.state !== "prompt") return;
        return navigator.clipboard.writeText(url);
      })
      .then(() => {
        setShowTooltip(true);
        setTimeout(() => setShowTooltip(false), 1000);
      })
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      .catch(() => {});
  };

  const anchorId = url.split("#").pop();

  return (
    <div className={clsx("flex gap-1 mb-4", className)}>
      <a
        href={url}
        className={clsx(
          "group relative bottom-[2px] px-2 inline-block cursor-pointer text-brand-red-500 hover:text-brand-red-300 active:text-brand-red-700",
          {
            "text-4xl": level === 1,
            "text-3xl": level === 2,
            "text-2xl": level === 3,
          },
        )}
        onClick={handleClick}
        title="Link kopieren"
      >
        <span className="opacity-30 group-hover:opacity-100 transition-opacity not-sr-only">
          #
        </span>

        {showTooltip && (
          <span className="absolute left-1/2 transform -translate-x-1/2 -translate-y-full bg-black dark:bg-white text-neutral-300 dark:text-black px-2 py-1 rounded text-sm font-medium">
            Link kopiert!
          </span>
        )}
      </a>

      {level === 1 && (
        <h1
          id={anchorId}
          className="text-3xl font-bold font-mono uppercase max-w-[55ch]"
        >
          {children}
        </h1>
      )}
      {level === 2 && (
        <h2
          id={anchorId}
          className="text-2xl font-bold font-mono uppercase max-w-[55ch]"
        >
          {children}
        </h2>
      )}
      {level === 3 && (
        <h3
          id={anchorId}
          className="text-xl font-bold font-mono uppercase max-w-[55ch]"
        >
          {children}
        </h3>
      )}
    </div>
  );
};
