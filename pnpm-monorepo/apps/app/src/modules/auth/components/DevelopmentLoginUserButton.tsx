import type { User } from "@sam-monorepo/database/client";

interface Props {
  readonly user: Pick<User, "id" | "name" | "email">;
  readonly disabled: boolean;
}

export const DevelopmentLoginUserButton = ({ user, disabled }: Props) => {
  const label = user.name ?? user.email ?? user.id;

  return (
    <button
      type="submit"
      name="userId"
      value={user.id}
      disabled={disabled}
      title={label}
      className="truncate rounded-secondary px-2 py-1 text-left text-sm hover:bg-neutral-800 focus-visible:bg-neutral-800 active:bg-neutral-700 transition-colors motion-reduce:transition-none cursor-pointer disabled:cursor-wait disabled:opacity-50"
    >
      {label}
    </button>
  );
};
