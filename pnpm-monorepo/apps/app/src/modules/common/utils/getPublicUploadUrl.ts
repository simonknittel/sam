import { env } from "@/env";

/** S3_PUBLIC_URL is either a bare host (https implied) or a full base URL — see its doc comment in env.ts. */
const resolveBaseUrl = (raw: string) =>
  raw.includes("://") ? raw.replace(/\/+$/, "") : `https://${raw}`;

/** Rendered by the root layout on <body>, read by getPublicUploadBaseUrl in the browser. */
export const PUBLIC_UPLOAD_BASE_URL_ATTRIBUTE = "data-public-upload-base-url";

/**
 * Resolved public base URL of the uploads bucket, usable in Server and
 * Client Components alike. S3_PUBLIC_URL is server-only and read at
 * runtime; the browser gets the resolved value from an attribute the root
 * layout renders on <body>. An attribute instead of a React context on
 * purpose: upload URLs are also built by plain utilities and by components
 * which render in both server and client trees, where hooks are not an
 * option.
 */
export const getPublicUploadBaseUrl = () => {
  if (typeof window === "undefined") return resolveBaseUrl(env.S3_PUBLIC_URL);

  const baseUrl = window.document.body.getAttribute(
    PUBLIC_UPLOAD_BASE_URL_ATTRIBUTE,
  );
  if (!baseUrl)
    throw new Error(
      `Missing ${PUBLIC_UPLOAD_BASE_URL_ATTRIBUTE} on <body> — it must be rendered by the root layout`,
    );
  return baseUrl;
};

/** Public URL of an uploaded object. */
export const getPublicUploadUrl = (uploadId: string) =>
  `${getPublicUploadBaseUrl()}/${uploadId}`;
