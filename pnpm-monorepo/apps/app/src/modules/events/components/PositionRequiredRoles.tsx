import { SingleRoleBadge } from "@/modules/roles/components/SingleRoleBadge";
import { EventPositionRoleMatch } from "@sam-monorepo/database/browser";
import clsx from "clsx";
import type { PositionType } from "./Position";

export const getRoleMatchLabel = (match: EventPositionRoleMatch) => {
  switch (match) {
    case EventPositionRoleMatch.ALL:
      return "Alle diese Rollen";

    case EventPositionRoleMatch.ANY:
      return "Eine dieser Rollen";

    default:
      throw new Error(`Unknown role match: ${match satisfies never}`);
  }
};

interface Props {
  readonly className?: string;
  readonly position: Pick<PositionType, "requiredRoles" | "requiredRoleMatch">;
}

/**
 * A role that the viewer cannot see shows as a placeholder: the viewer still
 * knows that the position requires a role
 */
export const PositionRequiredRoles = ({ className, position }: Props) => {
  if (position.requiredRoles.length <= 0)
    return <p className={clsx("text-neutral-500", className)}>-</p>;

  return (
    <div className={clsx("flex flex-col gap-1", className)}>
      {position.requiredRoles.length > 1 && (
        <p className="text-sm text-neutral-500">
          {getRoleMatchLabel(position.requiredRoleMatch)}
        </p>
      )}

      <div className="flex flex-wrap items-start gap-1">
        {position.requiredRoles.map(({ roleId }) => (
          <SingleRoleBadge
            key={roleId}
            roleId={roleId}
            hiddenRoleTitle="Dieser Posten erfordert diese Rolle, du darfst sie aber nicht sehen."
          />
        ))}
      </div>
    </div>
  );
};
