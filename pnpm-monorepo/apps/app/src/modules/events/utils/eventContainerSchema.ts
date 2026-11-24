import * as z from "zod";
import { EventContainerKind } from "./eventContainer";

/** The length cap keeps a hostile client from sending megabytes */
export const eventContainerSchema = z.object({
  kind: z.enum(EventContainerKind),
  id: z.string().min(1).max(64),
});
