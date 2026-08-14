import { useNow } from "next-intl";

export const useTimeLeft = (date: Date) => {
  const now = useNow({ updateInterval: 1000 });
  return getTimeLeft(date, now);
};

function getTimeLeft(date: Date, now: Date): [number, number, number] {
  return [
    Math.floor((date.getTime() - now.getTime()) / 1000 / 60 / 60),
    Math.floor((date.getTime() - now.getTime()) / 1000 / 60) % 60,
    Math.floor((date.getTime() - now.getTime()) / 1000) % 60,
  ];
}
