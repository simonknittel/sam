import { getLastSeenAt } from "@/modules/citizen/utils/getLastSeenAt";
import { formatDate } from "@/modules/common/utils/formatDate";
import { type Citizen } from "@sam-monorepo/database/client";

interface Props {
  entity: Pick<Citizen, "userId">;
}

export const LastSeenAt = async ({ entity }: Readonly<Props>) => {
  const lastSeenAt = await getLastSeenAt(entity.userId);

  return <>{formatDate(lastSeenAt, "short") || "-"}</>;
};
