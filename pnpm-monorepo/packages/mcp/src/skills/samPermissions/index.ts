import {
  NOTE_RULE_OPERATIONS,
  ROLE_RULE_OPERATIONS,
  TWO_FACTOR_AUTHENTICATION_PERMISSION_SETS,
  TWO_FACTOR_AUTHENTICATION_ROLE_RULE_OPERATIONS,
  transformPermissionSetToPermissionString,
} from "@sam-monorepo/domain";
import type { SkillDefinition } from "../../skillDefinition.js";
import { catalogReference } from "./catalogReference.js";

const twoFactorAuthenticationPermissions = [
  ...TWO_FACTOR_AUTHENTICATION_PERMISSION_SETS.map(
    (permissionSet) =>
      `\`${transformPermissionSetToPermissionString(permissionSet)}\``,
  ),
  ...TWO_FACTOR_AUTHENTICATION_ROLE_RULE_OPERATIONS.map(
    (operation) => `\`otherRole;${operation};roleId=<role id or *>\``,
  ),
];

export const samPermissionsSkill: SkillDefinition = {
  name: "sam-permissions",
  description:
    "Explains the roles and permissions of SAM: how a citizen gets permissions, the format of the permission strings, the rules for other roles and notes, and the catalog of all permissions with their German titles. Use it when the user asks what a permission does, which permission an action needs, why somebody has or does not have access, or before you change the permissions of a role.",
  instructions: `# Permissions in SAM

SAM gives access only through roles. A role has a list of permission strings. A user gets the permissions of the roles of their citizen. A user without a citizen gets no permissions from roles.

## How a citizen gets permissions

- **Role assignment**: a citizen has roles. A role can have levels. Then the role counts only when the citizen has the maximum level. A role without levels always counts.
- **Inheritance**: a role can inherit other roles. The citizen also gets the permissions of the inherited roles, but only of the roles that the role inherits directly (one level). Thus a change of a role also changes the roles that inherit it.
- **Clearance**: to use SAM at all, a user needs \`login;manage\` and a confirmed email. Some permissions also need the two-factor authentication (see below). The MCP server also needs \`mcp;use\`.

## Two-factor authentication

An admin and a user with one of these permissions can use SAM only when Discord reported the two-factor authentication of their Discord account at their last Discord login:

${twoFactorAuthenticationPermissions.map((permission) => `- ${permission}`).join("\n")}

A rule for only one role also requires it. A \`manage\` string of the same resource also requires it. The catalog marks these permissions. Without the two-factor authentication, the web app shows only a page that tells the user to enable it and to log in again with Discord, and the MCP server refuses the requests of the user.

## Permission strings

A permission string is \`<resource>;<operation>\`, optionally followed by attributes \`;<key>=<value>\`. Examples: \`event;read\`, \`task;read;taskDeleted=1\`.

- \`manage\` includes all operations of the same resource. It does not include a string with more attributes: \`task;manage\` does not give \`task;read;taskDeleted=1\`.
- \`negate\` blocks a resource: one negation removes all permissions of the resource, also the permissions from other roles. Example: \`login;negate\` ("Gesperrt") takes the clearance away, also when a different role gives \`login;manage\`.
- A string with attributes and a string without attributes never match. The value \`*\` matches all values of an attribute.
- \`citizen;read\` also controls the citizen pickers of all apps. Without it, a picker stays empty.

## Rules

The role page has two kinds of rules in addition to the catalog:

- **Other roles**: \`otherRole;<operation>;roleId=<role id or *>\`. Operations: ${ROLE_RULE_OPERATIONS.join(", ")}. \`read\` shows the role, \`assign\` gives the role to citizens, \`dismiss\` takes it from citizens.
- **Notes of citizens**: \`note;<operation>;noteTypeId=<note type id or *>;classificationLevelId=<classification level id or *>\`, optionally followed by \`;alsoUnconfirmed=true\` (also the notes that are not confirmed). Operations: ${NOTE_RULE_OPERATIONS.join(", ")}.

## Catalog

[references/catalog.md](references/catalog.md) lists all permissions of the role page with their German titles and descriptions. Read it when the user asks what a permission does or which permission an action needs. When you show a permission to the user, give its German title, because the role page shows this title.

## Tools

- \`list_roles\` and \`get_role\`: the roles that the user can see. Only with \`role;manage\`, \`get_role\` gives the permission strings of a role.
- \`list_citizens\` with a role filter: the citizens who have the role directly (also below its maximum level). For the effect of a change, also filter by the roles that inherit it.
- \`change_role_permissions\`: adds and removes permission strings of a role. Only catalog strings and rules can be added.
- \`update_role\`: the name, the description, the levels and the inactivity rules of a role.

To change the permissions of a role:

1. Find the role with \`list_roles\` and read its permission strings with \`get_role\`.
2. Select the strings from the catalog. Remember \`manage\`, the negations and the inheritance.
3. Tell the user the change and its effect (all citizens of the role and of the roles that inherit it). When you add a permission that requires the two-factor authentication, also tell the user that each of these citizens without it cannot use SAM until a Discord login reports it. Get a confirmation.
4. Call \`change_role_permissions\` with the strings to add and to remove.
`,
  files: [catalogReference],
};
