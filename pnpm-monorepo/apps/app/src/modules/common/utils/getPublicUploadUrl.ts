import { env } from "@/env";

/**
 * Public URL of an uploaded object. NEXT_PUBLIC_S3_PUBLIC_URL is either a
 * bare host (https is implied) or a full base URL incl. scheme, port and
 * bucket path — see its doc comment in env.ts.
 */
export const getPublicUploadUrl = (uploadId: string) => {
  const base = env.NEXT_PUBLIC_S3_PUBLIC_URL.includes("://")
    ? env.NEXT_PUBLIC_S3_PUBLIC_URL.replace(/\/+$/, "")
    : `https://${env.NEXT_PUBLIC_S3_PUBLIC_URL}`;
  return `${base}/${uploadId}`;
};
