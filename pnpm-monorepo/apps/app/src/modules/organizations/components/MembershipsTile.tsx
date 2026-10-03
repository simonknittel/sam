import { requireAuthentication } from "@/modules/auth/server";
import { CitizenPopover } from "@/modules/citizen/components/CitizenPopover";
import { Link } from "@/modules/common/components/Link";
import { DeleteOrganizationMembership } from "@/modules/spynet/components/DeleteOrganizationMembership";
import clsx from "clsx";
import { forbidden } from "next/navigation";
import { FaExternalLinkAlt, FaUsers } from "react-icons/fa";
import { getActiveOrganizationMemberships } from "../queries/getActiveOrganizationMemberships";
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
    <section className={clsx(className, "rounded-primary bg-secondary p-4")}>
      <h2 className="flex items-center gap-2 font-bold">
        <FaUsers /> Mitglieder ({activeOrganizationMemberships.length})
      </h2>

      {activeOrganizationMemberships.length > 0 ? (
        <ul className="mt-4 flex flex-wrap gap-2">
          {activeOrganizationMemberships
            .sort((a, b) =>
              (a.citizen.handle || a.citizen.id).localeCompare(
                b.citizen.handle || b.citizen.id,
              ),
            )
            .map((membership) => (
              <li
                key={membership.citizen.id}
                className="flex rounded-secondary bg-neutral-700/50"
              >
                <CitizenPopover citizenId={membership.citizen.id}>
                  <Link
                    href={`/app/spynet/citizen/${membership.citizen.id}`}
                    className="inline-flex items-center gap-2 px-2 py-1"
                  >
                    {membership.citizen.handle || membership.citizen.id}
                    <FaExternalLinkAlt className="text-xs text-brand-red-500 hover:text-brand-red-300" />
                  </Link>
                </CitizenPopover>

                {showDeleteButton && (
                  <div className="flex items-center border-l border-neutral-700">
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
        <p className="mt-4 text-neutral-500">Keine Mitglieder</p>
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
