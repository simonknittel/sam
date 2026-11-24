import { env } from "@/env";
import { type Organization } from "@sam-monorepo/database/client";

/** The scrape is a nice-to-have — a slow website must not stall the create. */
const SCRAPE_TIMEOUT_MS = 5_000;

/**
 * The page of an organization on the website has less than 200 kB. A larger
 * answer is not this page, thus the scrape stops to read it.
 */
const MAXIMUM_LOGO_PAGE_BYTES = 1_048_576;

/** A logo path of the website has approximately 50 characters */
const MAXIMUM_LOGO_PATH_LENGTH = 512;

const LOGO_ATTRIBUTE_PATTERN = /"(\/media\/[^"]+\/logo\/[^"]+)"/;

/**
 * Only the characters of a URL path. The app puts the path behind the base
 * URL of the website, thus a path of a different form could point to a
 * different host.
 */
const LOGO_PATH_PATTERN = /^\/media\/[\w.~%/-]+$/;

/** Null when the answer is larger than the cap */
const readCappedText = async (response: Response) => {
  if (!response.body) return null;

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let byteCount = 0;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;

    byteCount += value.byteLength;
    if (byteCount > MAXIMUM_LOGO_PAGE_BYTES) {
      await reader.cancel();
      return null;
    }

    chunks.push(value);
  }

  return Buffer.concat(chunks).toString("utf8");
};

/**
 * Undefined when the page has no logo, is not the page of an organization or is
 * too large.
 */
export const scrapeOrganizationLogo = async (
  organizationId: Organization["spectrumId"],
) => {
  const response = await fetch(
    new URL(`/orgs/${encodeURIComponent(organizationId)}`, env.RSI_BASE_URL),
    {
      signal: AbortSignal.timeout(SCRAPE_TIMEOUT_MS),
      // The host of the request is fixed: a redirect could leave it
      redirect: "error",
    },
  );
  if (!response.ok) return undefined;

  const html = await readCappedText(response);
  if (html === null) return undefined;

  const logoPath = LOGO_ATTRIBUTE_PATTERN.exec(html)?.[1];
  if (
    !logoPath ||
    logoPath.length > MAXIMUM_LOGO_PATH_LENGTH ||
    !LOGO_PATH_PATTERN.test(logoPath)
  )
    return undefined;

  return logoPath;
};
