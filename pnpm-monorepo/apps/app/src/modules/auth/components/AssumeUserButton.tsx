"use client";

import { Popover, usePopover } from "@/modules/common/components/Popover";
import { api } from "@/trpc/react";
import {
  Combobox,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
} from "@headlessui/react";
import Fuse from "fuse.js";
import { useState } from "react";

// Assuming a user swaps the whole session including audit attribution, so
// the cookie shouldn't outlive a debugging session by much.
const ASSUME_USER_COOKIE_MAX_AGE = 60 * 60; // 1 hour

const RESULT_LIMIT = 10;

interface AssumableUser {
  readonly id: string;
  readonly name: string | null;
  readonly email: string | null;
}

export const AssumeUserButton = () => {
  return (
    <Popover
      trigger={
        <button
          type="button"
          className="backdrop-blur-sm px-2 py-1 rounded-secondary bg-sky-500/50 hover:bg-sky-500 focus-visible:bg-sky-500 active:bg-sky-400 transition-colors motion-reduce:transition-none whitespace-nowrap text-xs font-mono uppercase cursor-pointer"
        >
          Assume user
        </button>
      }
      childrenClassName="w-72"
    >
      <AssumeUserCombobox />
    </Popover>
  );
};

const AssumeUserCombobox = () => {
  const { closePopover } = usePopover();
  const [query, setQuery] = useState("");

  const { isPending, data: users } = api.users.getAssumableUsers.useQuery(
    undefined,
    {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  );

  const handleChange = (user: AssumableUser | null) => {
    if (!user) return;

    document.cookie = `enable_admin=; path=/; samesite=lax; max-age=0;`;
    document.cookie = `assume_user=${user.id}; path=/; samesite=lax; max-age=${ASSUME_USER_COOKIE_MAX_AGE};`;

    closePopover();
    // Full reload instead of router.refresh(): a page rendered through the
    // forbidden() boundary is not re-rendered by a refresh and would keep
    // the previous user's redaction state
    window.location.reload();
  };

  const fuse = new Fuse(users ?? [], {
    keys: ["name", "email"],
  });

  const filteredUsers = query
    ? fuse.search(query, { limit: RESULT_LIMIT }).map((result) => result.item)
    : (users ?? []).slice(0, RESULT_LIMIT);

  return (
    <Combobox<AssumableUser | null>
      value={null}
      onChange={handleChange}
      onClose={() => setQuery("")}
    >
      {/* Must stay enabled while the users are loading: a disabled input
          can't receive the autoFocus when the popover opens. */}
      <ComboboxInput
        autoFocus
        aria-label="User"
        placeholder={isPending ? "Loading users…" : "Search user"}
        onChange={(event) => setQuery(event.target.value)}
        className="w-full rounded-secondary bg-neutral-900 py-1 px-2 text-sm focus:outline-hidden data-focus:outline-2 data-focus:-outline-offset-2 data-focus:outline-white/25"
      />

      <ComboboxOptions
        static
        className="mt-1 max-h-64 overflow-auto empty:hidden"
      >
        {filteredUsers.map((user) => (
          <AssumableUserOption key={user.id} user={user} />
        ))}
      </ComboboxOptions>
    </Combobox>
  );
};

interface AssumableUserOptionProps {
  readonly user: AssumableUser;
}

const AssumableUserOption = ({ user }: AssumableUserOptionProps) => {
  const label = user.name ?? user.email ?? user.id;

  return (
    <ComboboxOption
      value={user}
      className="flex flex-col cursor-pointer rounded-secondary py-1 px-2 select-none data-focus:bg-white/20"
    >
      <span className="text-white text-sm truncate" title={label}>
        {label}
      </span>

      {user.name && user.email && (
        <span className="text-xs text-neutral-500 truncate" title={user.email}>
          {user.email}
        </span>
      )}
    </ComboboxOption>
  );
};
