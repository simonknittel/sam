import {
  DEFAULT_PAGE_LIMIT,
  MAXIMUM_PAGE_LIMIT,
} from "@sam-monorepo/application";
import { SKILL_CATALOG } from "./skillCatalog.js";

/** The text that the client gives to the model with `server/discover` */
export const getInstructions = () =>
  `SAM (Sinister Administration Module) is the internal tooling, ERP and CRM of our Star Citizen organization. It consists of various tools for managing our organization.

- Call get_user without user_id first: it tells who the user is and which tool groups this client can use.
- The skills of this server explain SAM, its apps and its permissions: ${SKILL_CATALOG.map((skill) => skill.uri).join(", ")}. Load a skill, or read it as a resource, when you need to know how an app or a permission works.
- Most content is in German. Show it as it is. Write new content in German, unless the user asks for a different language.
- A list tool gives at most \`limit\` items (default ${DEFAULT_PAGE_LIMIT}, maximum ${MAXIMUM_PAGE_LIMIT}). When there are more items, the result has a \`next_cursor\`. To get the next page, call the same tool with the same arguments and give this value as \`cursor\`. When \`next_cursor\` is null, there are no more items. Send only a cursor that a tool gave you.`;
