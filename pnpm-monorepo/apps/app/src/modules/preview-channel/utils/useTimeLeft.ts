import { useEffect, useState } from "react";
import { getNow } from "./getNow";

export const useTimeLeft = (date: Date) => {
  const [timeLeft, setTimeLeft] = useState<[number, number, number]>(
    getTimeLeft(date),
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(getTimeLeft(date));
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  });

  return timeLeft;
};

function getTimeLeft(date: Date): [number, number, number] {
  const now = getNow();

  return [
    Math.floor((date.getTime() - now.getTime()) / 1000 / 60 / 60),
    Math.floor((date.getTime() - now.getTime()) / 1000 / 60) % 60,
    Math.floor((date.getTime() - now.getTime()) / 1000) % 60,
  ];
}
