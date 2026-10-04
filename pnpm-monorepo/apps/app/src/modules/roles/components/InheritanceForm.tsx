"use client";

import { ActionErrorNote } from "@/modules/actions/components/ActionErrorNote";
import { useAction } from "@/modules/actions/utils/useAction";
import { SubmitButton } from "@/modules/common/components/SubmitButton";
import { SingleRoleBadge } from "@/modules/roles/components/SingleRoleBadge";
import type { Role } from "@sam-monorepo/database/browser";
import clsx from "clsx";
import { FaSave } from "react-icons/fa";
import { updateRoleInheritance } from "../actions/updateRoleInheritance";

interface Props {
  readonly className?: string;
  readonly currentRole: Pick<Role, "id"> & {
    readonly inherits: readonly Pick<Role, "id">[];
  };
  readonly roles: readonly Pick<Role, "id" | "name">[];
}

export const InheritanceForm = ({ className, currentRole, roles }: Props) => {
  const { state, formAction } = useAction(updateRoleInheritance, {
    errorToast: false,
  });

  return (
    <form action={formAction} className={clsx(className)}>
      <input type="hidden" name="id" value={currentRole.id} />

      <div className="flex flex-col gap-2">
        {roles.map((role) => (
          <label
            key={role.id}
            className="group flex cursor-pointer items-center gap-2"
          >
            <input
              type="checkbox"
              name="roles"
              value={role.id}
              className="peer hidden"
              defaultChecked={currentRole.inherits.some(
                (r) => r.id === role.id,
              )}
            />

            <span className="relative block size-8 rounded-secondary bg-neutral-700 peer-checked:hidden">
              <span className="absolute inset-1 hidden rounded-secondary bg-green-500/50 group-hover:block" />
            </span>

            <span className="relative hidden size-8 rounded-secondary bg-neutral-700 peer-checked:block">
              <span className="absolute inset-1 rounded-secondary bg-green-500" />
            </span>

            <SingleRoleBadge
              roleId={role.id}
              showPlaceholder
              className="bg-transparent"
            />
          </label>
        ))}
      </div>

      <SubmitButton icon={<FaSave />} className="mt-4">
        Speichern
      </SubmitButton>

      <ActionErrorNote className="mt-4" state={state} />
    </form>
  );
};
