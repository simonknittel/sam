import { CitizenLink } from "@/modules/common/components/CitizenLink";
import { SingleRoleBadge } from "@/modules/roles/components/SingleRoleBadge";
import type { ManualNotificationOutput } from "@sam-monorepo/application";

interface Props {
  readonly notification: Pick<
    ManualNotificationOutput,
    "receiver_citizens" | "receiver_roles"
  >;
}

/**
 * The selected citizens and roles of a manual notification. A role that the
 * viewer cannot see shows as a placeholder, like in the role picker.
 */
export const ManualNotificationReceivers = ({ notification }: Props) => {
  if (
    notification.receiver_citizens.length <= 0 &&
    notification.receiver_roles.length <= 0
  )
    return <span className="text-neutral-500 italic">-</span>;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      {notification.receiver_roles.map((role) => (
        <SingleRoleBadge
          key={role.id}
          roleId={role.id}
          className="inline-flex"
          hiddenRoleTitle="Diese Rolle ist ein Empfänger, du darfst sie aber nicht sehen."
        />
      ))}

      {notification.receiver_citizens.map((citizen) => (
        <CitizenLink key={citizen.id} citizen={citizen} />
      ))}
    </div>
  );
};
