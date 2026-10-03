"use client";

import { CitizenLink } from "@/modules/common/components/CitizenLink";
import { useRolesContext } from "@/modules/roles/components/RolesContext";
import { SingleRoleBadge } from "@/modules/roles/components/SingleRoleBadge";
import type { CSSProperties } from "react";

export interface WikiRoleCitizen {
  readonly id: string;
  readonly handle: string | null;
  readonly deletedAt: Date | null;
}

interface Props {
  readonly roleId: string | null;
  readonly citizens: readonly WikiRoleCitizen[];
  readonly isLoading?: boolean;
  /** The node's width/position styles in the static render (wikiBlockLayoutStyle) */
  readonly style?: CSSProperties;
}

/**
 * The rendered role member list ("Rollenmitglieder"): the role badge above
 * the citizens it is assigned to. Shared between the static render for
 * readers and the editor node view so both look the same. The citizens are
 * resolved and permission-filtered server-side — different viewers may see
 * different lists.
 */
export const WikiRoleCitizensList = ({
  roleId,
  citizens,
  isLoading = false,
  style,
}: Props) => {
  /**
   * Same source as SingleRoleBadge: a role missing from the context is one
   * the viewer may not see, so the block names neither it nor its members.
   */
  const { roles } = useRolesContext();
  const role = roleId ? roles.find((role) => role.id === roleId) : undefined;

  if (!role)
    return (
      <div data-wiki-role-citizens="" style={style}>
        <p className="my-0! font-mono text-xs text-white/40 uppercase">
          Rollenmitglieder
        </p>

        <p className="my-1 text-sm text-neutral-400">
          {roleId ? "Rolle nicht verfügbar" : "Keine Rolle ausgewählt"}
        </p>
      </div>
    );

  return (
    <div data-wiki-role-citizens="" style={style}>
      <SingleRoleBadge roleId={role.id} />

      {citizens.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
          {citizens.map((citizen) => (
            /* Same link treatment as the page index, not prose's underline */
            <CitizenLink
              key={citizen.id}
              citizen={citizen}
              className="no-underline hover:underline"
            />
          ))}
        </div>
      ) : (
        <p className="my-1 text-sm text-neutral-400">
          {isLoading ? "Citizens werden geladen …" : "Keine Citizens"}
        </p>
      )}
    </div>
  );
};
