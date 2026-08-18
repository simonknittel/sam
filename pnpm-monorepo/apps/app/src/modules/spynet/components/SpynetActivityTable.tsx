import { ActivityTable } from "@/modules/activity/components/ActivityTable";
import {
  ACTIVITY_PAGE_SIZE,
  ActivityColumn,
  type ActivitySource,
} from "@/modules/activity/utils/activityEntry";
import {
  activityFilterParsers,
  getActivityFilters,
  hasActiveActivityFilters,
  type ActivityFilters,
} from "@/modules/activity/utils/activityFilterParams";
import { createCursorPaginationLoader } from "@/modules/common/CursorPagination/createCursorPaginationLoader";
import { paginateMergedSources } from "@/modules/common/CursorPagination/mergedCursor";
import {
  createOrganizationCreatedSource,
  createOrganizationMembershipSource,
  createOrganizationRenamedSource,
} from "@/modules/organizations/activity/organizationActivitySources";
import { OrganizationActivitySourceKey } from "@/modules/organizations/activity/organizationActivityTypes";
import {
  createRoleAssignmentLevelSource,
  createRoleAssignmentSource,
} from "@/modules/roles/activity/roleActivitySources";
import { RoleActivitySourceKey } from "@/modules/roles/activity/roleActivityTypes";
import type { SearchParams } from "nuqs/server";

const loadSearchParams = createCursorPaginationLoader(activityFilterParsers);

/**
 * Only the sources the type filter asks for are queried at all — filtering to
 * roles must not cost three organization queries.
 */
const buildSources = (filters: ActivityFilters) => {
  const isSelected = (type: string) =>
    !filters.types || filters.types.includes(type);

  const sources: ActivitySource[] = [];

  if (isSelected(OrganizationActivitySourceKey.Created))
    sources.push(
      createOrganizationCreatedSource({ withTarget: true, filters }),
    );

  if (isSelected(OrganizationActivitySourceKey.Renamed))
    sources.push(
      createOrganizationRenamedSource({ withTarget: true, filters }),
    );

  if (isSelected(OrganizationActivitySourceKey.Membership))
    sources.push(
      createOrganizationMembershipSource({ withTarget: true, filters }),
    );

  if (isSelected(RoleActivitySourceKey.Assignment))
    sources.push(createRoleAssignmentSource({ withTarget: true, filters }));

  if (isSelected(RoleActivitySourceKey.AssignmentLevel))
    sources.push(
      createRoleAssignmentLevelSource({ withTarget: true, filters }),
    );

  return sources;
};

interface Props {
  readonly className?: string;
  readonly searchParams: Promise<SearchParams>;
}

export const SpynetActivityTable = async ({
  className,
  searchParams,
}: Props) => {
  const searchParameters = await loadSearchParams(searchParams);
  const filters = getActivityFilters(searchParameters);

  const { entries, nextCursor, prevCursor } = await paginateMergedSources({
    sources: buildSources(filters),
    pageSize: ACTIVITY_PAGE_SIZE,
    cursor: searchParameters.cursor,
    direction: searchParameters.direction,
  });

  return (
    <ActivityTable
      className={className}
      entries={entries}
      columns={[ActivityColumn.Actor, ActivityColumn.Target]}
      emptyMessage={
        hasActiveActivityFilters(filters)
          ? "Keine Aktivität für diese Filter."
          : "Keine Aktivität vorhanden."
      }
      nextCursor={nextCursor}
      prevCursor={prevCursor}
    />
  );
};
