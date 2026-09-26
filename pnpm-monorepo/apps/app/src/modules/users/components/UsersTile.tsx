import { requireAuthentication } from "@/modules/auth/server";
import { CursorPaginationControls } from "@/modules/common/CursorPagination/CursorPaginationControls";
import clsx from "clsx";
import { type SearchParams } from "nuqs/server";
import { getUsersWithEntities } from "../queries/getUsersWithEntities";
import { loadUserListSearchParams } from "../utils/userListSearchParams";
import { UsersTable } from "./UsersTable";

interface Props {
  readonly className?: string;
  readonly searchParams: Promise<SearchParams>;
}

export const UsersTile = async ({ className, searchParams }: Props) => {
  const { sort, q, banned, cursor } =
    await loadUserListSearchParams(searchParams);

  const authentication = await requireAuthentication();
  const showBanActions = await authentication.authorize("user", "ban");

  const { users, nextCursor, prevCursor } = await getUsersWithEntities({
    sort,
    banStatus: banned,
    handleQuery: q,
    cursor,
  });

  return (
    <section className={clsx("p-4 bg-secondary rounded-primary", className)}>
      <UsersTable
        users={users}
        showBanActions={showBanActions}
        ownUserId={authentication.session.user.id}
      />

      <CursorPaginationControls
        nextCursor={nextCursor}
        prevCursor={prevCursor}
        className="mt-4"
      />
    </section>
  );
};
