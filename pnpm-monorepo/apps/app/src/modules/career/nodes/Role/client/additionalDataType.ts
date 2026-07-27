import type {
  getMyAssignedRoles,
  getVisibleRoles,
} from "@/modules/roles/utils/getRoles";

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type AdditionalDataType = {
  roles: Awaited<ReturnType<typeof getVisibleRoles>>;
  assignedRoles: Awaited<ReturnType<typeof getMyAssignedRoles>>;
};
