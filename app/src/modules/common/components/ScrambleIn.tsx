"use client";

import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type Ref,
} from "react";

interface Props {
  readonly text: string;
  /** Total animation duration in milliseconds */
  readonly duration?: number;
  /** How often (in ms) the scrambled letters refresh */
  readonly scrambleInterval?: number;
  readonly characters?: string;
  readonly className?: string;
  readonly scrambledClassName?: string;
  readonly autoStart?: boolean;
  readonly onStart?: () => void;
  readonly onComplete?: () => void;
  readonly ref?: Ref<ScrambleInHandle>;
}

export interface ScrambleInHandle {
  start: () => void;
  reset: () => void;
}

export const ScrambleIn = ({
  text,
  duration = 1000,
  scrambleInterval = 75,
  characters = "abcdefghijklmnopqrstuvwxyz!@#$%^&*()_+",
  className = "",
  scrambledClassName = "",
  autoStart = true,
  onStart,
  onComplete,
  ref,
}: Props) => {
  const [displayText, setDisplayText] = useState("");
  const [isAnimating, setIsAnimating] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const endTimerRef = useRef<NodeJS.Timeout | null>(null);

  const generateScrambled = useCallback(
    (length: number) => {
      return Array(length)
        .fill(0)
        .map(() => characters[Math.floor(Math.random() * characters.length)])
        .join("");
    },
    [characters],
  );

  const startAnimation = useCallback(() => {
    setIsAnimating(true);
    setIsDone(false);
    setDisplayText(generateScrambled(text.length));
    onStart?.();
  }, [onStart, generateScrambled, text.length]);

  const reset = useCallback(() => {
    setIsAnimating(false);
    setIsDone(false);
    setDisplayText("");
    if (timerRef.current) clearInterval(timerRef.current);
    if (endTimerRef.current) clearTimeout(endTimerRef.current);
  }, []);

  useImperativeHandle(ref, () => ({
    start: startAnimation,
    reset,
  }));

  useEffect(() => {
    if (autoStart) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      startAnimation();
    }
  }, [autoStart, startAnimation]);

  useEffect(() => {
    if (!isAnimating) return;

    // Scramble all letters every `scrambleInterval` ms
    timerRef.current = setInterval(() => {
      setDisplayText(generateScrambled(text.length));
    }, scrambleInterval);

    // After `duration` ms, stop and reveal the real text
    endTimerRef.current = setTimeout(() => {
      if (timerRef.current) clearInterval(timerRef.current);
      setIsAnimating(false);
      setIsDone(true);
      setDisplayText(text);
      onComplete?.();
    }, duration);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (endTimerRef.current) clearTimeout(endTimerRef.current);
    };
  }, [
    isAnimating,
    text,
    scrambleInterval,
    duration,
    generateScrambled,
    onComplete,
  ]);

  return (
    <>
      <span className="sr-only">{text}</span>
      <span className="inline-block whitespace-pre-wrap" aria-hidden="true">
        {isDone ? (
          <span className={className}>{displayText}</span>
        ) : (
          <span className={scrambledClassName}>{displayText}</span>
        )}
      </span>
    </>
  );
};
