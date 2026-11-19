import {
  getApplicationContext,
  getRequestActor,
  throwApplicationErrorForPage,
} from "@/modules/application";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import {
  findUserListPage,
  USER_LIST_SEARCH_QUERY_MAXIMUM_LENGTH,
  type UserListInput,
} from "@sam-monorepo/application";

const USERS_PAGE_SIZE = 50;

export const getUsersWithEntities = withTrace(
  "getUsersWithEntities",
  async ({ searchQuery, ...input }: UserListInput) => {
    try {
      return await findUserListPage(
        getApplicationContext(),
        await getRequestActor(),
        {
          ...input,
          // The query comes from the URL, thus it can be longer
          searchQuery:
            searchQuery?.slice(0, USER_LIST_SEARCH_QUERY_MAXIMUM_LENGTH) ??
            null,
        },
        { pageSize: USERS_PAGE_SIZE },
      );
    } catch (error) {
      return throwApplicationErrorForPage(error);
    }
  },
);
