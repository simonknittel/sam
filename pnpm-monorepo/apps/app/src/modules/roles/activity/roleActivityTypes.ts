export enum RoleActivitySourceKey {
  Assignment = "role-assignment",
  AssignmentLevel = "role-assignment-level",
}

/** The labels of the activity type filter and of the type column. */
export const ROLE_ACTIVITY_TYPE_LABELS: Record<RoleActivitySourceKey, string> =
  {
    [RoleActivitySourceKey.Assignment]: "Rollen-Zuweisung",
    [RoleActivitySourceKey.AssignmentLevel]: "Rollen-Level",
  };
