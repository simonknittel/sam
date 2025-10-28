import type { ScheduledHandler } from "aws-lambda";
import { initializeRequestContext } from "../common/requestContext";
import { midnightAutomationsHandler } from "./midnight-automations/handler";

export const handler: ScheduledHandler = async (event, context) => {
  return initializeRequestContext(context.awsRequestId, () =>
    midnightAutomationsHandler(),
  );
};
