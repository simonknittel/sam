import { env } from "./frequent-automations/setup"; // must be first

import {
  notifyEventsStartingSoon,
  notifyExpiredPenaltyEntries,
  notifyWikiCitizenMentions,
  sendBirthdayGreetings,
  sendEventMorningReminders,
  sendNewYearGreetings,
  sendSincomePayoutReminders,
  sendTaskDeadlineReminders,
} from "@sam-monorepo/application";
import type { ScheduledHandler } from "aws-lambda";
import { createApplicationContext } from "./common/createApplicationContext";
import { createJobFactory } from "./common/createJob";
import { runJobsInIsolation } from "./common/runJobsInIsolation";

const context = createApplicationContext({
  source: "frequent-automations",
  baseUrl: env.BASE_URL,
  publicUploadBaseUrl: env.PUBLIC_UPLOAD_BASE_URL,
});

const createJob = createJobFactory(context);

export const handler: ScheduledHandler = async () =>
  runJobsInIsolation({
    eventStartingSoon: createJob(notifyEventsStartingSoon),
    eventMorningReminders: createJob(sendEventMorningReminders),
    wikiCitizenMentioned: createJob(notifyWikiCitizenMentions),
    birthdayGreetings: createJob(sendBirthdayGreetings),
    newYearGreetings: createJob(sendNewYearGreetings),
    sincomePayoutReminders: createJob(sendSincomePayoutReminders),
    penaltyEntryExpired: createJob(notifyExpiredPenaltyEntries),
    taskDeadlineReminders: createJob(sendTaskDeadlineReminders),
  });
