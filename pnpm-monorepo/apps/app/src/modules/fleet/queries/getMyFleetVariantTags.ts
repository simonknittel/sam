import { requireAuthentication } from "@/modules/auth/server";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { forbidden } from "next/navigation";
import { cache } from "react";
import { getOwnerFleetVariantTags } from "./ownerFleet";

export const getMyFleetVariantTags = cache(
  withTrace("getMyFleetVariantTags", async () => {
    const authentication = await requireAuthentication();
    if (!(await authentication.authorize("ship", "read"))) forbidden();

    const citizenId = authentication.session.entity?.id;
    if (!citizenId) return [];

    return getOwnerFleetVariantTags(citizenId);
  }),
);
