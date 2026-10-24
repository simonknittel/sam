"use client";

import { useRolesContext } from "@/modules/roles/components/RolesContext";
import { SingleRoleBadge } from "@/modules/roles/components/SingleRoleBadge";
import type { ManualNotificationRoleOutput } from "@sam-monorepo/application";

interface Props {
  readonly role: ManualNotificationRoleOutput;
}

/**
 * A receiver role of a manual notification. A role that the viewer cannot
 * see shows as a placeholder, like the selected roles of the role picker.
 */
export const ReceiverRoleBadge = ({ role }: Props) => {
  const { roles } = useRolesContext();
  const isVisible = roles.some((visibleRole) => visibleRole.id === role.id);

  if (!isVisible)
    return (
      <span
        className="inline-flex h-8 items-center rounded-secondary bg-neutral-700/50 px-2 font-mono text-sm text-neutral-500"
        title="Diese Rolle ist ein Empfänger, du darfst sie aber nicht sehen."
      >
        Verborgene Rolle
      </span>
    );

  return <SingleRoleBadge roleId={role.id} className="inline-flex" />;
};
