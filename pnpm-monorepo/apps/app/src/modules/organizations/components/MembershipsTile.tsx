import { requireAuthenticationPage } from "@/modules/auth/server";
import { CitizenLink } from "@/modules/common/components/CitizenLink";
import { DeleteOrganizationMembership } from "@/modules/spynet/components/DeleteOrganizationMembership";
import clsx from "clsx";
import { forbidden } from "next/navigation";
import { FaUsers } from "react-icons/fa";
import { getOrganizationById } from "../queries/getOrganizationById";
import { CreateMembership } from "./CreateMembership";

interface Props {
  readonly className?: string;
  readonly id: string;
}

export const MembershipsTile = async ({ className, id }: Props) => {
  const authentication = await requireAuthenticationPage();
  if (!(await authentication.authorize("organizationMembership", "read")))
    forbidden();

  const { memberships: activeOrganizationMemberships } =
    await getOrganizationById(id);

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
          {activeOrganizationMemberships.map((membership) => (
            <li
              key={membership.citizen.id}
              className="flex rounded-secondary bg-neutral-700/50"
            >
              <CitizenLink
                citizen={membership.citizen}
                className="inline-block px-2 py-1"
              />

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
