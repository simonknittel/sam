import * as z from "zod/mini";

/** Response of POST /api/upload */
export const createUploadResponseSchema = z.object({
  item: z.object({ id: z.string() }),
  presignedUploadUrl: z.url(),
});
