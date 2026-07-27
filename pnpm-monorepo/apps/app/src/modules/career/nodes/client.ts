import { markdownNode } from "./Markdown/client";
import { roleNode } from "./Role/client";
import { roleCitizensNode } from "./RoleCitizens/client";

export const nodeDefinitions = [
  markdownNode,
  roleNode,
  roleCitizensNode,
] as const;
