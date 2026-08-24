import { getLastSeenAt } from "@/modules/citizen/utils/getLastSeenAt";
import { formatDate } from "@/modules/common/utils/formatDate";
import { type Entity } from "@sam-monorepo/database/client";

interface Props {
  entity: Pick<Entity, "discordId">;
}

export const LastSeenAt = async ({ entity }: Readonly<Props>) => {
  const lastSeenAt = await getLastSeenAt(entity);

  return <>{formatDate(lastSeenAt, "short") || "-"}</>;
};
