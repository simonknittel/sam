import * as z from "zod";
import { EventContainerKind } from "./eventContainer";

/**
 * Container reference as it travels through a tRPC input. Ids are opaque
 * cuid/cuid2 strings; the length cap keeps a hostile client from sending
 * megabytes.
 */
export const eventContainerSchema = z.object({
  kind: z.enum(EventContainerKind),
  id: z.string().min(1).max(64),
});
