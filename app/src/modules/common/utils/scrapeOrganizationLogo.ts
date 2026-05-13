import { type Organization } from "@/generated/prisma/client";

export const scrapeOrganizationLogo = async (
  organizationId: Organization["spectrumId"],
) => {
  const website = await fetch(
    `https://robertsspaceindustries.com/orgs/${organizationId}`,
  );

  const html = await website.text();

  const logoUrl = /"(\/media\/(?:.+)\/logo\/(?:.+))"/.exec(html);

  return logoUrl?.[1] || undefined;
};
