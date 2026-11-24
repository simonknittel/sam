/**
 * The format of a permission string that
 * `transformPermissionStringToPermissionSet` parses: `resource;operation`
 * followed by any number of `;key=value` pairs. Only a value can contain `*`.
 *
 * The pattern must agree with the CHECK constraint
 * `PermissionString_format_check` of the database.
 */
export const PERMISSION_STRING_PATTERN =
  /^[\w\-]+;[\w\-]+(?:;[\w\-]+=[\w\-\*]+)*$/;
