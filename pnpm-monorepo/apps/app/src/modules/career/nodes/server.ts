import { markdownNode } from "./Markdown/server";
import { roleNode } from "./Role/server";
import { roleCitizensNode } from "./RoleCitizens/server";

export const nodeDefinitions = [
  markdownNode,
  roleNode,
  roleCitizensNode,
] as const;
