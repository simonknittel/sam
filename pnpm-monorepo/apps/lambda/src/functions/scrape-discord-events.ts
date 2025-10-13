import type { ScheduledHandler } from "aws-lambda";
import { scrapeDiscordEventsHandler } from "./scrape-discord-events/handler";
import { initializeRequestContext } from "../common/requestContext";

export const handler: ScheduledHandler = async (event, context) => {
	return initializeRequestContext(context.awsRequestId, () => scrapeDiscordEventsHandler());
};
