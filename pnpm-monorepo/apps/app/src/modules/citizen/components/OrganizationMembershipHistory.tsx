import { ActivityTable } from "@/modules/activity/components/ActivityTable";
import {
  ACTIVITY_PAGE_SIZE,
  ActivityColumn,
} from "@/modules/activity/utils/activityEntry";
import { createCursorPaginationLoader } from "@/modules/common/CursorPagination/createCursorPaginationLoader";
import { paginateMergedSources } from "@/modules/common/CursorPagination/mergedCursor";
import { createOrganizationMembershipSource } from "@/modules/organizations/activity/organizationActivitySources";
import type { Entity } from "@sam-monorepo/database/client";
import type { SearchParams } from "nuqs/server";

const loadSearchParams = createCursorPaginationLoader({});

interface Props {
  readonly className?: string;
  readonly id: Entity["id"];
  readonly searchParams: Promise<SearchParams>;
}

export const OrganizationMembershipHistory = async ({
  className,
  id,
  searchParams,
}: Props) => {
  const { cursor, direction } = await loadSearchParams(searchParams);

  const { entries, nextCursor, prevCursor } = await paginateMergedSources({
    sources: [createOrganizationMembershipSource({ citizenId: id })],
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
