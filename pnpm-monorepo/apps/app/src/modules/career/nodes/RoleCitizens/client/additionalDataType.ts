import type { getCitizensGroupedByVisibleRoles } from "@/modules/citizen/queries/getCitizensGroupedByVisibleRoles";
import type {
  getMyAssignedRoles,
  getVisibleRoles,
} from "@/modules/roles/utils/getRoles";

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type AdditionalDataType = {
  roles: Awaited<ReturnType<typeof getVisibleRoles>>;
  assignedRoles: Awaited<ReturnType<typeof getMyAssignedRoles>>;
  citizensGroupedByVisibleRoles: Awaited<
    ReturnType<typeof getCitizensGroupedByVisibleRoles>
  >;
};
