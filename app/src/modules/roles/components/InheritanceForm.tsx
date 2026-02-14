"use client";

import { Button2 } from "@/modules/common/components/Button2";
import Note from "@/modules/common/components/Note";
import { SingleRoleBadge } from "@/modules/roles/components/SingleRoleBadge";
import type { Role, Upload } from "@prisma/client";
import clsx from "clsx";
import { useActionState } from "react";
import { FaSave, FaSpinner } from "react-icons/fa";
import { updateRoleInheritance } from "../actions/updateRoleInheritance";

interface Props {
  readonly className?: string;
  readonly currentRole: Role & {
    readonly inherits: Role[];
  };
  readonly roles: (Role & {
    readonly icon: Upload | null;
  })[];
}

export const InheritanceForm = ({ className, currentRole, roles }: Props) => {
  const [state, formAction, isPending] = useActionState(
    updateRoleInheritance,
    null,
  );

  return (
    <form action={formAction} className={clsx(className)}>
      <input type="hidden" name="id" value={currentRole.id} />

      <div className="flex flex-col gap-2">
        {roles.map((role) => (
          <label
            key={role.id}
            className="group flex gap-2 items-center cursor-pointer"
          >
            <input
              type="checkbox"
              name="roles"
              value={role.id}
              className="hidden peer"
              defaultChecked={currentRole.inherits.some(
                (r) => r.id === role.id,
              )}
            />

            <span className="w-8 h-8 bg-neutral-700 rounded-secondary block relative peer-checked:hidden">
              <span className="absolute inset-1 rounded-secondary bg-green-500/50 hidden group-hover:block" />
            </span>

            <span className="w-8 h-8 bg-neutral-700 rounded-secondary hidden relative peer-checked:block">
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

      <Button2 type="submit" disabled={isPending} className="mt-4">
        {isPending ? <FaSpinner className="animate-spin" /> : <FaSave />}
        Speichern
      </Button2>

      {state && (
        <Note
          type={state.success ? "success" : "error"}
          message={state.success ? state.success : state.error}
          className={clsx("mt-4", {
            "animate-pulse": isPending,
          })}
        />
      )}
    </form>
  );
};
