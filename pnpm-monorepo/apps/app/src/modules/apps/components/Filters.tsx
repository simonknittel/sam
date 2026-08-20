"use client";

import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import { Link } from "@/modules/common/components/Link";
import clsx from "clsx";
import { useCallback, type MouseEvent } from "react";
import type { App } from "../utils/types";

interface Props {
  readonly className?: string;
  readonly appLinks?: App[] | null;
  readonly selectedTags?: string[];
  readonly setSelectedTags?: (tags: string[]) => void;
}

export const Filters = ({
  className,
  appLinks,
  selectedTags,
  setSelectedTags,
}: Props) => {
  const tags = new Set<string>();
  for (const appLink of appLinks || []) {
    if ("tags" in appLink && appLink.tags?.length) {
      for (const tag of appLink.tags) {
        tags.add(tag);
      }
    }
  }

  /**
   * "Alle" is not a tag but the reset, so it stays ahead of the alphabetically
   * sorted ones. `localeCompare` sorts the mixed-case tags by letter rather
   * than by case, which is what the uppercased labels look like.
   */
  const filters: { key: string; label: string }[] = [
    { key: "all", label: "Alle" },
    ...Array.from(tags)
      .toSorted((first, second) => first.localeCompare(second))
      .map((tag) => ({ key: tag, label: tag })),
  ];

  const handleClick = useCallback(
    (event: MouseEvent, tag: string) => {
      if (!setSelectedTags) return;
      event.preventDefault();
      setSelectedTags([tag]);
    },
    [setSelectedTags],
  );

  return (
    <div className={clsx("flex flex-wrap gap-2 justify-center", className)}>
      {filters.map(({ key, label }) => (
        <Button2
          as={Link}
          href={`/app/apps?tag=${key}`}
          variant={
            selectedTags?.includes(key)
              ? Button2Variant.Primary
              : Button2Variant.Secondary
          }
          key={key}
          replace
          onClick={(e) => handleClick(e, key)}
        >
          {label.charAt(0).toUpperCase() + label.slice(1)}
        </Button2>
      ))}
    </div>
  );
};
