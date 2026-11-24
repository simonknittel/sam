export enum RoleActivitySourceKey {
  Assignment = "role-assignment",
  AssignmentLevel = "role-assignment-level",
}

export const ROLE_ACTIVITY_TYPE_LABELS: Record<RoleActivitySourceKey, string> =
  {
    [RoleActivitySourceKey.Assignment]: "Rollen-Zuweisung",
    [RoleActivitySourceKey.AssignmentLevel]: "Rollen-Level",
  };
