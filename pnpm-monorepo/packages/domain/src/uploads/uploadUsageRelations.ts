import type { Prisma } from "@sam-monorepo/database/client";
import { UPLOAD_USAGE_RELATION_BY_TYPE } from "./uploadUsage.js";

export const UNUSED_UPLOAD_WHERE: Prisma.UploadWhereInput = Object.fromEntries(
  Object.values(UPLOAD_USAGE_RELATION_BY_TYPE).map((relation) => [
    relation,
    { none: {} },
  ]),
);
