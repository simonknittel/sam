import { SingleRoleBadge } from "@/modules/roles/components/SingleRoleBadge";
import { EventPositionRoleMatch } from "@sam-monorepo/database/browser";
import clsx from "clsx";
import type { PositionType } from "./Position";

type RoleRequirement = Pick<
  PositionType,
  "requiredRoles" | "requiredRoleMatch"
>;

/** The options of the role match in the position form */
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

const getRoleMatchSuffix = (match: EventPositionRoleMatch) => {
  switch (match) {
    case EventPositionRoleMatch.ALL:
      return "alle diese Rollen";

    case EventPositionRoleMatch.ANY:
      return "eine dieser Rollen";

    default:
      throw new Error(`Unknown role match: ${match satisfies never}`);
  }
};

/** The match is only a choice for two roles or more */
export const getRequiredRolesHeading = (position: RoleRequirement) =>
  position.requiredRoles.length > 1
    ? `Erforderliche Rolle (${getRoleMatchSuffix(position.requiredRoleMatch)})`
    : "Erforderliche Rolle";

export const HIDDEN_REQUIRED_ROLE_TITLE =
  "Dieser Posten erfordert diese Rolle, du darfst sie aber nicht sehen.";

interface Props {
  readonly className?: string;
  readonly roleIds: readonly string[];
}

/**
 * A role that the viewer cannot see shows as a placeholder: the viewer still
 * knows that the position requires a role
 */
export const RequiredRoleBadges = ({ className, roleIds }: Props) => (
  <div className={clsx("flex flex-wrap items-start gap-1", className)}>
    {roleIds.map((roleId) => (
      <SingleRoleBadge
        key={roleId}
        roleId={roleId}
        hiddenRoleTitle={HIDDEN_REQUIRED_ROLE_TITLE}
      />
    ))}
  </div>
);

interface PositionRequiredRolesProps {
  readonly className?: string;
  readonly position: RoleRequirement;
}

export const PositionRequiredRoles = ({
  className,
  position,
}: PositionRequiredRolesProps) => {
  if (position.requiredRoles.length <= 0)
    return <p className={clsx("text-neutral-500", className)}>-</p>;

  return (
    <RequiredRoleBadges
      roleIds={position.requiredRoles.map(({ roleId }) => roleId)}
      className={className}
    />
  );
};
