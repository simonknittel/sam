import { getApplicationContext } from "@/modules/application";
import { findVariantCatalog } from "@sam-monorepo/application";
import { protectedProcedure, toTrpcError } from "../../trpc";

export const getAll = protectedProcedure.query(async () => {
  try {
    return await findVariantCatalog(getApplicationContext());
  } catch (error) {
    throw toTrpcError(error, "Failed to load the variants");
  }
});
