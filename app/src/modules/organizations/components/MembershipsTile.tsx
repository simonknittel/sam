import { requireAuthentication } from "@/modules/auth/server";
import { Link } from "@/modules/common/components/Link";
import { DeleteOrganizationMembership } from "@/modules/spynet/components/DeleteOrganizationMembership";
import clsx from "clsx";
import { forbidden } from "next/navigation";
import { FaExternalLinkAlt, FaUsers } from "react-icons/fa";
import { getActiveOrganizationMemberships } from "../queries";
import { CreateMembership } from "./CreateMembership";

interface Props {
  readonly className?: string;
  readonly id: string;
}

export const MembershipsTile = async ({ className, id }: Props) => {
  const authentication = await requireAuthentication();
  if (!(await authentication.authorize("organizationMembership", "read")))
    forbidden();

  const activeOrganizationMemberships =
    await getActiveOrganizationMemberships(id);

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
    <section
      className={clsx(className, "rounded-primary p-4 background-secondary")}
    >
      <h2 className="font-bold flex gap-2 items-center">
        <FaUsers /> Mitglieder ({activeOrganizationMemberships.length})
      </h2>

      {activeOrganizationMemberships.length > 0 ? (
        <ul className="flex gap-2 flex-wrap mt-4">
          {activeOrganizationMemberships
            .sort((a, b) =>
              (a.citizen.handle || a.citizen.id).localeCompare(
                b.citizen.handle || b.citizen.id,
              ),
            )
            .map((membership) => (
              <li
                key={membership.citizen.id}
                className="rounded-secondary bg-neutral-700/50 flex"
              >
                <Link
                  href={`/app/spynet/citizen/${membership.citizen.id}`}
                  className="inline-flex gap-2 px-2 py-1 items-center"
                >
                  {membership.citizen.handle || membership.citizen.id}
                  <FaExternalLinkAlt className="text-brand-red-500 hover:text-brand-red-300 text-xs" />
                </Link>

                {showDeleteButton && (
                  <div className="border-l border-neutral-700 flex items-center">
                    <DeleteOrganizationMembership
                      className="p-2"
                      organizationId={id}
                      citizenId={membership.citizen.id}
                    />
                  </div>
                )}
              </li>
            ))}
        </ul>
      ) : (
        <p className="text-neutral-500 mt-4">Keine Mitglieder</p>
      )}

      {showCreateButton && (
        <CreateMembership
          className="mt-2"
          organizationId={id}
          showConfirmButton={showConfirmButton}
        />
      )}
    </section>
  );
};
