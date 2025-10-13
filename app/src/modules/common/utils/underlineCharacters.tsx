import type { ReactNode } from "react";

export const underlineCharacters = (
  text: string,
  ranges: readonly [number, number][] = [],
) => {
  if (!ranges.length) return text;

  const result: ReactNode[] = [];
  let lastIndex = 0;

  ranges.forEach(([start, end], i) => {
    if (lastIndex < start) result.push(text.slice(lastIndex, start));

    result.push(
      <span key={i} className="text-brand-red-300">
        {text.slice(start, end + 1)}
      </span>,
    );

    lastIndex = end + 1;
  });

  if (lastIndex < text.length) result.push(text.slice(lastIndex));

  return result;
};
