import "./frequent-automations/setup";

import type { ScheduledHandler } from "aws-lambda";
import { initializeRequestContext } from "./common/requestContext";
import { eventStartingSoon } from "./frequent-automations/eventStartingSoon";

export const handler: ScheduledHandler = async (event, context) => {
  return initializeRequestContext(context.awsRequestId, async () => {
    await eventStartingSoon();
  });
};
