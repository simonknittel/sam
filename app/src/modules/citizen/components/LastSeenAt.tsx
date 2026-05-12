import { type Entity } from "@/generated/prisma/client";
import { formatDate } from "@/modules/common/utils/formatDate";
import { getLastSeenAt } from "@/modules/common/utils/getLastSeenAt";

interface Props {
  entity: Entity;
}

export const LastSeenAt = async ({ entity }: Readonly<Props>) => {
  const lastSeenAt = await getLastSeenAt(entity);

  return <>{formatDate(lastSeenAt, "short") || "-"}</>;
};
