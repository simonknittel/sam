import type { ScheduledHandler } from "aws-lambda";
import { initializeRequestContext } from "../common/requestContext";
import { scrapeDiscordEventsHandler } from "./scrape-discord-events/handler";

export const handler: ScheduledHandler = async (event, context) => {
  return initializeRequestContext(context.awsRequestId, () =>
    scrapeDiscordEventsHandler(),
  );
};
