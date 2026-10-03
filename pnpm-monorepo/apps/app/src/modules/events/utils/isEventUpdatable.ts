import type { Event } from "@sam-monorepo/database/client";
import { getEventEndTime } from "@sam-monorepo/domain";

export const isEventUpdatable = (event: Pick<Event, "startTime" | "endTime">) =>
  getEventEndTime(event) > new Date();
