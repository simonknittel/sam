import { requireAuthentication } from "@/modules/auth/server";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { forbidden } from "next/navigation";
import { cache } from "react";
import { getOwnerFleet } from "./ownerFleet";

type MyFleetOptions = Parameters<typeof getOwnerFleet>[1];

export const getMyFleet = cache(
  withTrace("getMyFleet", async (options: MyFleetOptions = {}) => {
    const authentication = await requireAuthentication();
    if (!(await authentication.authorize("ship", "read"))) forbidden();

    const citizenId = authentication.session.entity?.id;
    if (!citizenId) {
      return {
        ships: [],
        total: 0,
        nextCursor: null,
        prevCursor: null,
      };
    }

    return getOwnerFleet(citizenId, options);
  }),
);
