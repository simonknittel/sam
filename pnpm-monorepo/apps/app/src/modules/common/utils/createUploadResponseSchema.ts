import { z } from "zod";

/** Response of POST /api/upload (create Upload record + presigned PUT URL) */
export const createUploadResponseSchema = z.object({
  item: z.object({ id: z.string() }),
  presignedUploadUrl: z.url(),
});
