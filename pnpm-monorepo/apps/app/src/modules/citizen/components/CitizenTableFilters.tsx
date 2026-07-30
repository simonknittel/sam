import { requireAuthentication } from "@/modules/auth/server";
import { getVisibleRoles } from "@/modules/roles/utils/getRoles";
import { Filter } from "@/modules/spynet/components/Filter";
import clsx from "clsx";
import { RoleFilter } from "./RoleFilter";
import { UnknownsFilter } from "./UnknownsFilter";

interface Props {
  readonly className?: string;
}

export const CitizenTableFilters = async ({ className }: Props) => {
  const authentication = await requireAuthentication();
  const [showDiscordId, showTeamspeakId] = await Promise.all([
    authentication.authorize("discord-id", "read"),
    authentication.authorize("teamspeak-id", "read"),
  ]);

  const visibleRoles = await getVisibleRoles();

  return (
    <div className={clsx("flex gap-2 items-center", className)}>
      <Filter name="Unbekannt">
        <UnknownsFilter
          showDiscordId={showDiscordId}
          showTeamspeakId={showTeamspeakId}
        />
      </Filter>

      {visibleRoles.length > 0 && (
        <Filter name="Rollen">
          <RoleFilter roles={visibleRoles} />
        </Filter>
      )}
    </div>
  );
};
