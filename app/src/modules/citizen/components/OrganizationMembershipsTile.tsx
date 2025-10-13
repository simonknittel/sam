import { prisma } from "@/db";
import { requireAuthentication } from "@/modules/auth/server";
import { Link } from "@/modules/common/components/Link";
import { Tile } from "@/modules/common/components/Tile";
import { DeleteOrganizationMembership } from "@/modules/spynet/components/DeleteOrganizationMembership";
import { OrganizationMembershipVisibility } from "@prisma/client";
import clsx from "clsx";
import Image from "next/image";
import { FaExternalLinkAlt } from "react-icons/fa";
import { CreateOrganizationMembership } from "./CreateOrganizationMembership";

interface Props {
  readonly className?: string;
  readonly id: string;
}

export const OrganizationMembershipsTile = async ({ className, id }: Props) => {
  const authentication = await requireAuthentication();

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

  const activeOrganizationMemberships =
    await prisma.activeOrganizationMembership.findMany({
      where: {
        citizenId: id,
        visibility: {
          in: alsoVisibilityRedacted
            ? [
                OrganizationMembershipVisibility.PUBLIC,
                OrganizationMembershipVisibility.REDACTED,
              ]
            : [OrganizationMembershipVisibility.PUBLIC],
        },
      },
      include: {
        organization: true,
      },
    });

  const showDeleteButton = await authentication.authorize(
    "organizationMembership",
    "delete",
  );

  const showCreateButton = await authentication.authorize(
    "organizationMembership",
    "create",
  );

  const showConfirmButton = await authentication.authorize(
    "organizationMembership",
    "confirm",
  );

  return (
    <Tile
      heading="Aktuell"
      cta={
        showCreateButton ? (
          <CreateOrganizationMembership
            citizenId={id}
            showConfirmButton={showConfirmButton}
          />
        ) : null
      }
      className={clsx(className)}
    >
      {activeOrganizationMemberships.length > 0 ? (
        <ul className="flex gap-2 flex-wrap">
          {activeOrganizationMemberships
            .sort((a, b) =>
              a.organization.name.localeCompare(b.organization.name),
            )
            .map((membership) => (
              <li
                key={membership.organization.id}
                className="rounded-secondary bg-neutral-700/50 flex overflow-hidden"
              >
                <Link
                  href={`/app/spynet/organization/${membership.organization.id}`}
                  className="inline-flex"
                >
                  {membership.organization.logo && (
                    <span className="bg-black align-bottom flex w-[32px] items-center justify-center">
                      <Image
                        src={`https://robertsspaceindustries.com${membership.organization.logo}`}
                        alt=""
                        width={24}
                        height={24}
                        loading="lazy"
                      />
                    </span>
                  )}

                  <span className="inline-flex gap-2 px-2 py-1 items-center">
                    {membership.organization.name}
                    <FaExternalLinkAlt className="text-brand-red-500 hover:text-brand-red-300 text-xs" />
                  </span>
                </Link>

                {showDeleteButton && (
                  <div className="border-l border-neutral-700 flex items-center">
                    <DeleteOrganizationMembership
                      className="p-2"
                      organizationId={membership.organization.id}
                      citizenId={id}
                    />
                  </div>
                )}
              </li>
            ))}
        </ul>
      ) : (
        <p className="text-neutral-500">Keine Organisationen</p>
      )}
    </Tile>
  );
};
