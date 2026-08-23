import { requireAuthentication } from "@/modules/auth/server";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import type { Entity } from "@sam-monorepo/database/client";
import { forbidden } from "next/navigation";
import { cache } from "react";
import { getOwnerFleet } from "./ownerFleet";

type CitizenFleetOptions = Parameters<typeof getOwnerFleet>[1];

export const getCitizenFleet = cache(
  withTrace(
    "getCitizenFleet",
    async (citizenId: Entity["id"], options: CitizenFleetOptions = {}) => {
      const authentication = await requireAuthentication();
      if (!(await authentication.authorize("otherShips", "read"))) forbidden();

      return getOwnerFleet(citizenId, options);
    },
  ),
);
