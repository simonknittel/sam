import {
  DEFAULT_PAGE_LIMIT,
  MAXIMUM_PAGE_LIMIT,
  type ApplicationContext,
} from "@sam-monorepo/application";
import { ORGANIZATION_TIMEZONE } from "@sam-monorepo/domain";
import { getAccountPageUrl } from "./accountPageUrl.js";

/** The text that the client gives to the model with `server/discover` */
export const getInstructions = (context: Pick<ApplicationContext, "urls">) =>
  `SAM (Sinister Administration Module) is the internal ERP and CRM of a Star Citizen organization: citizens and organizations (Spynet), roles, penalty points, the fleet, the wiki, events with their lineups, tasks, manual notifications, the changelog of SAM, and the system log (the audit log). The tools read and change this data with the roles of the signed-in user.

- Call get_current_user first: it tells who the user is and which tool groups this client can use.
- Most content is in German. Show it as it is. Write new content in German, unless the user asks for a different language.
- Ids are opaque cuids. Use only ids that a tool gave you. Never make an id. A citizen handle is display text: it can change and it does not identify a citizen. Thus give the id to the next tool.
- Times in the results are ISO 8601 in UTC. The organization uses the time zone ${ORGANIZATION_TIMEZONE}. Show times to the user in this time zone. A time without a time zone from the user is a time in this time zone: give it to a tool without an offset.
- A list tool gives at most \`limit\` items (default ${DEFAULT_PAGE_LIMIT}, maximum ${MAXIMUM_PAGE_LIMIT}). When there are more items, the result has a \`next_cursor\`. To get the next page, call the same tool with the same arguments and give this value as \`cursor\`. When \`next_cursor\` is null, there are no more items. Send only a cursor that a tool gave you.
- A result that starts with "ForbiddenError" means that the user does not have the role for the operation. Tell this to the user and do not try again. "NotFoundError" means that the item does not exist or that the user cannot see it. "ConflictError" and "ValidationError" tell what prevents the operation.
- A write has the same effects as the same action in the SAM web app: it writes an entry to the audit log (marked as an action through the MCP server) and sends the same notifications to other members.
- The user selects the tools of this client and disconnects clients on ${getAccountPageUrl(context)}.`;
