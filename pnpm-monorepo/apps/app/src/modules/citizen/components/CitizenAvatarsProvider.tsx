"use client";

import type { ReactNode } from "react";
import { createContext, useContext } from "react";

/** Empty outside of the app shell */
const CitizenAvatarsContext = createContext<ReadonlyMap<string, string>>(
  new Map(),
);

interface Props {
  readonly children: ReactNode;
  readonly avatarUrls: ReadonlyMap<string, string>;
}

/**
 * The avatars travel one time with the app shell: a link knows only the id of
 * its citizen.
 */
export const CitizenAvatarsProvider = ({ children, avatarUrls }: Props) => {
  return (
    <CitizenAvatarsContext value={avatarUrls}>{children}</CitizenAvatarsContext>
  );
};

/** Undefined for a citizen without a login or without an avatar */
export const useCitizenAvatarUrl = (citizenId: string) =>
  useContext(CitizenAvatarsContext).get(citizenId);
