"use client";

import { useAction } from "@/modules/actions/utils/useAction";
import { PopoverBaseUI } from "@/modules/common/components/PopoverBaseUI";
import type { User } from "@sam-monorepo/database/client";
import { developmentLogin } from "../actions/developmentLogin";
import { DevelopmentLoginUserButton } from "./DevelopmentLoginUserButton";

interface Props {
  readonly users: readonly Pick<User, "id" | "name" | "email">[];
  readonly redirectTo: string | null;
}

export const DevelopmentLoginPopover = ({ users, redirectTo }: Props) => {
  const { formAction, isPending } = useAction(developmentLogin);

  return (
    <div className="fixed top-2 left-1/2 -translate-x-1/2 z-50">
      <PopoverBaseUI
        title="Dev login"
        trigger="Dev login"
        triggerClassName="backdrop-blur-sm px-2 py-1 rounded-secondary bg-amber-500/50 hover:bg-amber-500 focus-visible:bg-amber-500 active:bg-amber-400 transition-colors motion-reduce:transition-none whitespace-nowrap text-xs font-mono uppercase cursor-pointer"
        side="bottom"
        openOnHover={false}
        positionerClassName="z-50"
        childrenClassName="w-72 max-h-96 overflow-auto"
      >
        {users.length > 0 ? (
          <form action={formAction} className="flex flex-col gap-1">
            <input type="hidden" name="redirectTo" value={redirectTo ?? ""} />

            {users.map((user) => (
              <DevelopmentLoginUserButton
                key={user.id}
                user={user}
                disabled={isPending}
              />
            ))}
          </form>
        ) : (
          <p className="text-sm text-neutral-500">
            This database has no admin with a Discord account.
          </p>
        )}
      </PopoverBaseUI>
    </div>
  );
};
