"use client";

import { useMediaQuery } from "@base-ui/react/unstable-use-media-query";
import { useEffect, useState } from "react";

/** How often (in ms) the scrambled letters refresh */
const SCRAMBLE_INTERVAL = 75;

const DEFAULT_CHARACTERS = "abcdefghijklmnopqrstuvwxyz!@#$%^&*()_+";

interface Props {
  readonly text: string;
  /** Total animation duration in milliseconds */
  readonly duration?: number;
  /** Automatically retrigger the scramble effect every N milliseconds after completion */
  readonly repeatInterval?: number;
  readonly characters?: string;
}

export const ScrambleIn = ({
  text,
  duration = 1000,
  repeatInterval,
  characters = DEFAULT_CHARACTERS,
}: Props) => {
  const prefersReducedMotion = useMediaQuery(
    "(prefers-reduced-motion: reduce)",
    { defaultMatches: false },
  );

  const [displayText, setDisplayText] = useState("");

  useEffect(() => {
    if (prefersReducedMotion) return;

    const generateScrambled = () =>
      Array.from(
        { length: text.length },
        () => characters[Math.floor(Math.random() * characters.length)],
      ).join("");

    let scrambleTimer: ReturnType<typeof setInterval> | undefined;
    let revealTimer: ReturnType<typeof setTimeout> | undefined;
    let repeatTimer: ReturnType<typeof setTimeout> | undefined;

    const animate = () => {
      scrambleTimer = setInterval(() => {
        setDisplayText(generateScrambled());
      }, SCRAMBLE_INTERVAL);

      revealTimer = setTimeout(() => {
        if (scrambleTimer) clearInterval(scrambleTimer);
        setDisplayText(text);
        if (repeatInterval) repeatTimer = setTimeout(animate, repeatInterval);
      }, duration);
    };

    animate();

    return () => {
      if (scrambleTimer) clearInterval(scrambleTimer);
      if (revealTimer) clearTimeout(revealTimer);
      if (repeatTimer) clearTimeout(repeatTimer);
    };
  }, [prefersReducedMotion, text, characters, duration, repeatInterval]);

  return (
    <>
      <span className="sr-only">{text}</span>
      {/*
       * The invisible final text sets the size of the box. The scrambled text
       * lies on top of it and cannot change the size: in a font that is not
       * monospace (example: a seasonal hero font), each random character has a
       * different width, and the layout around the box would move.
       */}
      <span className="inline-grid whitespace-pre-wrap" aria-hidden="true">
        <span className="invisible col-start-1 row-start-1">{text}</span>
        <span className="col-start-1 row-start-1 contain-size">
          {prefersReducedMotion ? text : displayText}
        </span>
      </span>
    </>
  );
};
