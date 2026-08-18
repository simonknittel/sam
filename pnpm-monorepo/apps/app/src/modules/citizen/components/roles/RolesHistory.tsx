import { ActivityTable } from "@/modules/activity/components/ActivityTable";
import {
  ACTIVITY_PAGE_SIZE,
  ActivityColumn,
} from "@/modules/activity/utils/activityEntry";
import { requireAuthentication } from "@/modules/auth/server";
import { createCursorPaginationLoader } from "@/modules/common/CursorPagination/createCursorPaginationLoader";
import { paginateMergedSources } from "@/modules/common/CursorPagination/mergedCursor";
import {
  createRoleAssignmentLevelSource,
  createRoleAssignmentSource,
} from "@/modules/roles/activity/roleActivitySources";
import { type Entity } from "@sam-monorepo/database/client";
import type { SearchParams } from "nuqs/server";

const loadSearchParams = createCursorPaginationLoader({});

interface Props {
  readonly className?: string;
  readonly entity: Entity;
  readonly searchParams: Promise<SearchParams>;
}

export const RolesHistory = async ({
  className,
  entity,
  searchParams,
}: Props) => {
  const authentication = await requireAuthentication();
  if (!(await authentication.authorize("otherRole", "read"))) return null;

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
