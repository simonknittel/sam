import { CitizenLink } from "@/modules/common/components/CitizenLink";
import type { ManualNotificationOutput } from "@sam-monorepo/application";
import { ReceiverRoleBadge } from "./ReceiverRoleBadge";

interface Props {
  readonly notification: Pick<
    ManualNotificationOutput,
    "receiver_citizens" | "receiver_roles"
  >;
}

/** The selected citizens and roles of a manual notification */
export const ManualNotificationReceivers = ({ notification }: Props) => {
  if (
    notification.receiver_citizens.length <= 0 &&
    notification.receiver_roles.length <= 0
  )
    return <span className="text-neutral-500 italic">-</span>;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      {notification.receiver_roles.map((role) => (
        <ReceiverRoleBadge key={role.id} role={role} />
      ))}

      {notification.receiver_citizens.map((citizen) => (
        <CitizenLink
          key={citizen.id}
          citizen={{ ...citizen, deletedAt: null }}
        />
      ))}
    </div>
  );
};
