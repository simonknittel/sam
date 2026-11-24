import * as z from "zod";

/**
 * The defaults fit a local run. Terraform sets them for a function whose use
 * cases build links.
 */
export const applicationContextEnvironmentShape = {
  BASE_URL: z.url().default("http://localhost:3000"),
  PUBLIC_UPLOAD_BASE_URL: z.url().default("http://localhost:9000/uploads"),
};
