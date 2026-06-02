"use client";

import clsx from "clsx";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export const RedBar = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const pathname = usePathname();
  const [style, setStyle] = useState({});
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;

    const container = ref.current.closest("[data-red-bar-container]");
    if (!container) return;

    const links = container.querySelectorAll(`a`);
    const link = findMatchingLink(links, pathname);
    if (!link) return;

    const containerRect = container.getBoundingClientRect();
    const linkRect = link.getBoundingClientRect();

    setStyle({
      transform: `translateY(${linkRect.top - containerRect.top}px)`,
    });

    setIsInitialized(true);

    setTimeout(() => {
      setIsVisible(true);
    }, 100);
  }, [pathname]);

  return (
    <div
      className={clsx(
        "w-0.5 h-[1em] bg-interaction-500 absolute left-4 before:rounded-secondary pointer-events-none top-3",
        {
          "opacity-100": isVisible,
          "opacity-0": !isVisible,
          "transition-all": isInitialized,
        },
      )}
      style={style}
      ref={ref}
    />
  );
};

const findMatchingLink = (
  links: NodeListOf<HTMLAnchorElement>,
  pathname: string,
) => {
  let bestMatch: HTMLAnchorElement | null = null;
  let bestMatchHref = "";

  for (const link of links) {
    if (!link) continue;

    const href = link.getAttribute("href");
    if (!href) continue;

    if (pathname.startsWith(href) && href.length > bestMatchHref.length) {
      bestMatch = link;
      bestMatchHref = href;
    }
  }

  return bestMatch;
};
