"use client";

import { runActionAndReload } from "@/modules/actions/utils/runActionAndReload";
import type { RouterOutputs } from "@/modules/common/utils/api";
import { api, TRPCReactProvider } from "@/trpc/react";
import {
  Combobox,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
} from "@headlessui/react";
import Fuse from "fuse.js";
import { useState, useTransition } from "react";
import { assumeUser } from "../actions/assumeUser";

const RESULT_LIMIT = 10;

type AssumableUser = RouterOutputs["users"]["getAssumableUsers"][number];

// The toolbar also shows outside of the app shell, for example on the
// clearance page, where no tRPC provider exists. In the app shell, the second
// provider shares the query client of the browser.
export const AssumeUserTool = () => {
  return (
    <TRPCReactProvider>
      <AssumeUserCombobox />
    </TRPCReactProvider>
  );
};

const AssumeUserCombobox = () => {
  const [query, setQuery] = useState("");
  const [isPending, startTransition] = useTransition();

  const { isPending: isLoading, data: users } =
    api.users.getAssumableUsers.useQuery(undefined, {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    });

  const handleChange = (user: AssumableUser | null) => {
    if (!user) return;

    const formData = new FormData();
    formData.set("userId", user.id);

    startTransition(() => runActionAndReload(assumeUser, formData));
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
      disabled={isPending}
      immediate
    >
      <ComboboxInput
        aria-label="User"
        placeholder={isLoading ? "Loading users…" : "Search user"}
        onChange={(event) => setQuery(event.target.value)}
        className="w-full rounded-secondary bg-neutral-900 py-1 px-2 text-sm data-hover:bg-neutral-800 active:bg-neutral-800 focus:outline-hidden data-focus:outline-2 data-focus:-outline-offset-2 data-focus:outline-white/25 data-disabled:opacity-50"
      />

      {/* The list opens inside the panel, thus the other tools of the panel
          must stay usable and visible to assistive technology */}
      <ComboboxOptions
        modal={false}
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
      className="flex flex-col cursor-pointer rounded-secondary py-1 px-2 select-none data-focus:bg-white/20 active:bg-white/30"
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
