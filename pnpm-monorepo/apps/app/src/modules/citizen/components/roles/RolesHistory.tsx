import { ActivityTable } from "@/modules/activity/components/ActivityTable";
import {
  ACTIVITY_PAGE_SIZE,
  ActivityColumn,
} from "@/modules/activity/utils/activityEntry";
import { createCursorPaginationLoader } from "@/modules/common/CursorPagination/createCursorPaginationLoader";
import {
  createRoleAssignmentLevelSource,
  createRoleAssignmentSource,
} from "@/modules/roles/activity/roleActivitySources";
import { getVisibleRoles } from "@/modules/roles/utils/getRoles";
import { type Citizen } from "@sam-monorepo/database/client";
import { paginateMergedSources } from "@sam-monorepo/domain";
import type { SearchParams } from "nuqs/server";

const loadSearchParams = createCursorPaginationLoader({});

interface Props {
  readonly className?: string;
  readonly entity: Pick<Citizen, "id">;
  readonly searchParams: Promise<SearchParams>;
}

export const RolesHistory = async ({
  className,
  entity,
  searchParams,
}: Props) => {
  const visibleRoles = await getVisibleRoles();
  if (visibleRoles.length === 0) return null;

  const { cursor, direction } = await loadSearchParams(searchParams);

  const { entries, nextCursor, prevCursor } = await paginateMergedSources({
    sources: [
      createRoleAssignmentSource({ citizenId: entity.id }),
      createRoleAssignmentLevelSource({ citizenId: entity.id }),
    ],
    pageSize: ACTIVITY_PAGE_SIZE,
    cursor,
    direction,
  });

  return (
    <ActivityTable
      className={className}
      heading="Verlauf"
      entries={entries}
      columns={[ActivityColumn.Actor]}
      emptyMessage="Keine Aktivität vorhanden."
      nextCursor={nextCursor}
      prevCursor={prevCursor}
    />
  );
};
