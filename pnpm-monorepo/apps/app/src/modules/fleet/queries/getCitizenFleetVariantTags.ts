import { requireAuthentication } from "@/modules/auth/server";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import type { Citizen } from "@sam-monorepo/database/client";
import { forbidden } from "next/navigation";
import { cache } from "react";
import { getOwnerFleetVariantTags } from "./ownerFleet";

export const getCitizenFleetVariantTags = cache(
  withTrace("getCitizenFleetVariantTags", async (citizenId: Citizen["id"]) => {
    const authentication = await requireAuthentication();
    if (!(await authentication.authorize("otherShips", "read"))) forbidden();

    return getOwnerFleetVariantTags(citizenId);
  }),
);
