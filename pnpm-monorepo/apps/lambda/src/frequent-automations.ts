import "./frequent-automations/setup";

import type { ScheduledHandler } from "aws-lambda";
import { initializeRequestContext } from "./common/requestContext";
import { runJobsInIsolation } from "./common/runJobsInIsolation";
import { birthdayGreetings } from "./frequent-automations/birthdayGreetings";
import { eventStartingSoon } from "./frequent-automations/eventStartingSoon";
import { newYearGreetings } from "./frequent-automations/newYearGreetings";
import { wikiCitizenMentioned } from "./frequent-automations/wikiCitizenMentioned";

export const handler: ScheduledHandler = async (event, context) => {
  return initializeRequestContext(context.awsRequestId, () =>
    runJobsInIsolation({
      eventStartingSoon,
      wikiCitizenMentioned,
      birthdayGreetings,
      newYearGreetings,
    }),
  );
};
