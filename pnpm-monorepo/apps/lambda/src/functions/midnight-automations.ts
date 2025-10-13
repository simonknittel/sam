import type { ScheduledHandler } from "aws-lambda";
import { midnightAutomationsHandler } from "./midnight-automations/handler";
import { initializeRequestContext } from "../common/requestContext";

export const handler: ScheduledHandler = async (event, context) => {
	return initializeRequestContext(context.awsRequestId, () => midnightAutomationsHandler());
};
