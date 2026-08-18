import { ActivityTable } from "@/modules/activity/components/ActivityTable";
import {
  ACTIVITY_PAGE_SIZE,
  ActivityColumn,
} from "@/modules/activity/utils/activityEntry";
import { requireAuthentication } from "@/modules/auth/server";
import { createCursorPaginationLoader } from "@/modules/common/CursorPagination/createCursorPaginationLoader";
import { paginateMergedSources } from "@/modules/common/CursorPagination/mergedCursor";
import type { Organization } from "@sam-monorepo/database/client";
import { forbidden } from "next/navigation";
import type { SearchParams } from "nuqs/server";
import {
  createOrganizationCreatedSource,
  createOrganizationMembershipSource,
  createOrganizationRenamedSource,
} from "../activity/organizationActivitySources";

const loadSearchParams = createCursorPaginationLoader({});

interface Props {
  readonly className?: string;
  readonly id: Organization["id"];
  readonly searchParams: Promise<SearchParams>;
}

export const ActivityTile = async ({ className, id, searchParams }: Props) => {
  const authentication = await requireAuthentication();
  if (!(await authentication.authorize("organization", "read"))) forbidden();

  const { cursor, direction } = await loadSearchParams(searchParams);

  const { entries, nextCursor, prevCursor } = await paginateMergedSources({
    sources: [
      createOrganizationCreatedSource({ organizationId: id }),
      createOrganizationRenamedSource({ organizationId: id }),
      createOrganizationMembershipSource({
        organizationId: id,
        withTarget: true,
        withConfirmation: true,
      }),
    ],
    pageSize: ACTIVITY_PAGE_SIZE,
    cursor,
    direction,
  });

  return (
    <ActivityTable
      className={className}
      heading="Aktivität"
      entries={entries}
      columns={[ActivityColumn.Target, ActivityColumn.Confirmation]}
      targetLabel="Citizen"
      emptyMessage="Keine Aktivität vorhanden."
      nextCursor={nextCursor}
      prevCursor={prevCursor}
    />
  );
};
