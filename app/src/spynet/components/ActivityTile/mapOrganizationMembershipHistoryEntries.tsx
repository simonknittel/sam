import { requireAuthentication } from "@/auth/server";
import { Link } from "@/common/components/Link";
import {
  OrganizationMembershipType,
  OrganizationMembershipVisibility,
  type Entity,
  type Organization,
  type OrganizationMembershipHistoryEntry,
} from "@prisma/client";
import Image from "next/image";

export const mapOrganizationMembershipHistoryEntries = async (
  entries: (Pick<
    OrganizationMembershipHistoryEntry,
    "id" | "createdAt" | "type" | "visibility"
  > & {
    citizen: Pick<Entity, "id" | "handle">;
    organization: Pick<Organization, "id" | "name" | "logo">;
  })[],
) => {
  const authentication = await requireAuthentication();
  if (!(await authentication.authorize("organization", "read"))) return [];

  const alsoVisibilityRedacted = await authentication.authorize(
    "organizationMembership",
    "read",
    [
      {
        key: "alsoVisibilityRedacted",
        value: true,
      },
    ],
  );

  return entries
    .filter((entry) =>
      (alsoVisibilityRedacted
        ? [
            OrganizationMembershipVisibility.PUBLIC,
            OrganizationMembershipVisibility.REDACTED,
          ]
        : [OrganizationMembershipVisibility.PUBLIC]
      ).includes(entry.visibility),
    )
    .map((entry) => {
      switch (entry.type) {
        case OrganizationMembershipType.MAIN:
          return {
            key: entry.id,
            date: entry.createdAt,
            message: (
              <p>
                Citizen{" "}
                <Link
                  href={`/app/spynet/citizen/${entry.citizen.id}`}
                  className="inline-flex gap-1 items-center text-sinister-red-500 hover:text-sinister-red-300"
                >
                  {entry.citizen.handle}
                </Link>{" "}
                wurde der Organisation{" "}
                <Link
                  href={`/app/spynet/organization/${entry.organization.id}`}
                  className="text-sinister-red-500 hover:text-sinister-red-300"
                >
                  {entry.organization.logo && (
                    <span className="inline-block rounded bg-black mr-1 align-bottom">
                      <Image
                        src={`https://robertsspaceindustries.com${entry.organization.logo}`}
                        alt=""
                        width={24}
                        height={24}
                      />
                    </span>
                  )}
                  {entry.organization.name}
                </Link>{" "}
                als <em>Main</em> hinzugefügt
              </p>
            ),
          };

        case OrganizationMembershipType.AFFILIATE:
          return {
            key: entry.id,
            date: entry.createdAt,
            message: (
              <p>
                Citizen{" "}
                <Link
                  href={`/app/spynet/citizen/${entry.citizen.id}`}
                  className="inline-flex gap-1 items-center text-sinister-red-500 hover:text-sinister-red-300"
                >
                  {entry.citizen.handle}
                </Link>{" "}
                wurde der Organisation{" "}
                <Link
                  href={`/app/spynet/organization/${entry.organization.id}`}
                  className="inline-flex gap-1 items-center text-sinister-red-500 hover:text-sinister-red-300"
                >
                  {entry.organization.name}
                </Link>{" "}
                als <em>Affiliate</em> hinzugefügt
              </p>
            ),
          };

        case OrganizationMembershipType.LEFT:
          return {
            key: entry.id,
            date: entry.createdAt,
            message: (
              <p>
                Citizen{" "}
                <Link
                  href={`/app/spynet/citizen/${entry.citizen.id}`}
                  className="inline-flex gap-1 items-center text-sinister-red-500 hover:text-sinister-red-300"
                >
                  {entry.citizen.handle}
                </Link>{" "}
                wurde aus der Organisation{" "}
                <Link
                  href={`/app/spynet/organization/${entry.organization.id}`}
                  className="inline-flex gap-1 items-center text-sinister-red-500 hover:text-sinister-red-300"
                >
                  {entry.organization.name}
                </Link>{" "}
                entfernt
              </p>
            ),
          };
      }
    });
};
