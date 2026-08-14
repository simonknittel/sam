import { useNow } from "next-intl";
import { type Schedule } from "./schedule";

export const useSchedule = (schedule: Schedule) => {
  const now = useNow({ updateInterval: 1000 });

  return {
    currentlyLive: getCurrentlyLive(schedule, now),
    nextLive: getNextLive(schedule, now),
  };
};

function getCurrentlyLive(
  schedule: Schedule,
  now: Date,
): Schedule[number] | undefined {
  return schedule.find((time) => time.start <= now && now <= time.end);
}

function getNextLive(
  schedule: Schedule,
  now: Date,
): Schedule[number] | undefined {
  return schedule.find((time) => time.start > now);
}
