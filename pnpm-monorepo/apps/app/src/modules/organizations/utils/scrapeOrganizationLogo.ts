import { env } from "@/env";
import { type Organization } from "@sam-monorepo/database/client";

/** The scrape is a nice-to-have — a slow website must not stall the create. */
const SCRAPE_TIMEOUT_MS = 5_000;

export const scrapeOrganizationLogo = async (
  organizationId: Organization["spectrumId"],
) => {
  const website = await fetch(
    new URL(`/orgs/${encodeURIComponent(organizationId)}`, env.RSI_BASE_URL),
    { signal: AbortSignal.timeout(SCRAPE_TIMEOUT_MS) },
  );

  const html = await website.text();

  const logoUrl = /"(\/media\/(?:.+)\/logo\/(?:.+))"/.exec(html);

  return logoUrl?.[1] || undefined;
};
