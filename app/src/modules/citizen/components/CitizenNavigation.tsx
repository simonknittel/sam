import { requireAuthentication } from "@/modules/auth/server";
import { SubNavigation } from "@/modules/common/components/SubNavigation";
import type { Entity } from "@prisma/client";
import clsx from "clsx";
import { forbidden } from "next/navigation";

interface Props {
  readonly className?: string;
  readonly citizenId: Entity["id"];
}

export const CitizenNavigation = async ({ className, citizenId }: Props) => {
  const authentication = await requireAuthentication();
  if (!authentication.session.entity) forbidden();
  const showOrganizations = await authentication.authorize(
    "organizationMembership",
    "read",
  );
  const showSilcTransactions =
    citizenId === authentication.session.entity.id
      ? await authentication.authorize(
          "silcTransactionOfCurrentCitizen",
          "read",
        )
      : await authentication.authorize("silcTransactionOfOtherCitizen", "read");
  const showPenaltyPoints =
    citizenId === authentication.session.entity.id
      ? await authentication.authorize("ownPenaltyEntry", "read")
      : await authentication.authorize("penaltyEntry", "read");

  const pages = [
    {
      name: "Übersicht",
      path: `/app/spynet/citizen/${citizenId}`,
    },

    {
      name: "Notizen",
      path: `/app/spynet/citizen/${citizenId}/notes`,
    },

    ...(showOrganizations
      ? [
          {
            name: "Organisationen",
            path: `/app/spynet/citizen/${citizenId}/organizations`,
          },
        ]
      : []),

    {
      name: "Rollen",
      path: `/app/spynet/citizen/${citizenId}/roles`,
    },

    ...(showSilcTransactions
      ? [
          {
            name: "SILC",
            path: `/app/spynet/citizen/${citizenId}/silc`,
          },
        ]
      : []),

    ...(showPenaltyPoints
      ? [
          {
            name: "Strafpunkte",
            path: `/app/spynet/citizen/${citizenId}/penalty-points`,
          },
        ]
      : []),
  ];

  return (
    <SubNavigation
      pages={pages}
      className={clsx("flex flex-wrap", className)}
    />
  );
};
