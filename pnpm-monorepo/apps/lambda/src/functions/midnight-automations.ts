import type { Handler } from "aws-lambda";
import { midnightAutomationsHandler } from "./midnight-automations/handler";
import { initializeRequestContext } from "../common/requestContext";

export const handler: Handler = async (event, context) => {
	return initializeRequestContext(context.awsRequestId, () => midnightAutomationsHandler());
};
