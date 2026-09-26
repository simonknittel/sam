# Permissions

The permission logic is in [packages/permissions](../pnpm-monorepo/packages/permissions). These rules are not easy to see in the code:

- **Inheritance has one level.** A role gets the permissions of the roles that it inherits directly (`resolveEffectiveRoles`), but not the permissions that these roles inherit. Thus a cycle between roles is harmless. Only a role that inherits itself is not permitted.
- **`manage` includes all operations of a resource**, also `negate` (`comparePermissionSets`). It does not include a permission string with more attributes: `task;manage` does not give `task;read;taskDeleted=1`. To find out if a role has a negation, compare the literal permission string.
- **Scoped and unscoped permissions never match.** `authorize("otherRole", "read")` without a `roleId` fails for a user who has only `otherRole;read;roleId=…`.
- **`citizen;read` controls all citizen pickers.** Without it, a picker stays empty.
- **When you copy content into a different container, check the permissions of the target.** Example: in an event template, the owner can read all briefing pages. Thus "save event as template" requires the permission to manage the event, not only to read it.
- **A Prisma `where` cannot compare the level of a role assignment with the maximum level of the role.** Use the query only to make the list smaller. Then decide in memory with `resolveEffectiveRoles` (example: `resolveEventVisibility`).
- **Admin mode** requires the cookie `enable_admin=1`, which the admin toolbar sets. A user without a citizen gets no permissions from roles.
