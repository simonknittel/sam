"use client";

import { runAction } from "@/modules/actions/utils/runAction";
import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import { Select } from "@/modules/common/components/form/Select";
import { PopoverBaseUI } from "@/modules/common/components/PopoverBaseUI";
import { SingleRoleBadge } from "@/modules/roles/components/SingleRoleBadge";
import { EventTemplateAccessType } from "@sam-monorepo/database/browser";
import { useId, useState, useTransition, type FormEventHandler } from "react";
import { FaSave, FaTrash, FaUsers } from "react-icons/fa";
import { updateEventTemplateRoleAccess } from "../actions/updateEventTemplateRoleAccess";

/** "Kein Zugriff" is the absence of a row, so it needs a value of its own */
enum AccessChoice {
  None = "none",
  Read = "read",
  Edit = "edit",
}

const ACCESS_CHOICE_LABELS: Record<AccessChoice, string> = {
  [AccessChoice.None]: "Kein Zugriff",
  [AccessChoice.Read]: "Lesen und verwenden",
  [AccessChoice.Edit]: "Bearbeiten",
};

interface Entry {
  readonly roleId: string;
  readonly choice: AccessChoice;
}

type StoredAccess = readonly {
  readonly roleId: string;
  readonly type: EventTemplateAccessType;
}[];

const toEntries = (roleAccess: StoredAccess): Entry[] =>
  roleAccess.map((access) => ({
    roleId: access.roleId,
    choice:
      access.type === EventTemplateAccessType.EDIT
        ? AccessChoice.Edit
        : AccessChoice.Read,
  }));

/** Identifies the stored shares regardless of the order they arrive in */
const signatureOf = (roleAccess: StoredAccess) =>
  roleAccess
    .map((access) => `${access.roleId}:${access.type}`)
    .toSorted()
    .join(",");

interface SelectableRole {
  readonly id: string;
  readonly name: string;
}

interface Props {
  readonly templateId: string;
  readonly roleAccess: StoredAccess;
  /** Roles the current user may see (`otherRole;read;roleId=…`) */
  readonly selectableRoles: readonly SelectableRole[];
}

export const EventTemplateRoleAccessEditor = ({
  templateId,
  roleAccess,
  selectableRoles,
}: Props) => {
  /**
   * Seeded from the stored rows rather than from the visible roles, so a
   * share with a role the current user cannot see stays listed instead of
   * being dropped on the next save.
   */
  const [entries, setEntries] = useState<Entry[]>(() => toEntries(roleAccess));

  /**
   * A save rewrites every row, so the server comes back with the same shares
   * in a different order. Adopt its answer, but only when the shares really
   * changed — otherwise a re-render would discard edits in progress.
   */
  const serverSignature = signatureOf(roleAccess);
  const [renderedSignature, setRenderedSignature] = useState(serverSignature);
  if (renderedSignature !== serverSignature) {
    setRenderedSignature(serverSignature);
    setEntries(toEntries(roleAccess));
  }

  const [isPending, startTransition] = useTransition();

  /**
   * Submitted by hand rather than through `<form action>`: React resets a
   * form once its action resolves, which snaps every select back to the
   * option the server rendered as selected while the component's state stays
   * put — leaving the selects showing the tiers from before the save.
   */
  const handleSubmit: FormEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault();

    const formData = new FormData();
    formData.append("templateId", templateId);
    for (const entry of entries) {
      if (entry.choice === AccessChoice.Read)
        formData.append("readRoleId[]", entry.roleId);
      if (entry.choice === AccessChoice.Edit)
        formData.append("editRoleId[]", entry.roleId);
    }

    startTransition(async () => {
      await runAction(updateEventTemplateRoleAccess, formData);
    });
  };

  const addableRoles = selectableRoles.filter(
    (role) => !entries.some((entry) => entry.roleId === role.id),
  );

  /**
   * Sorted for display rather than kept in state, so the list reads the same
   * before and after a save and a newly added role lands where it belongs
   * instead of at the bottom. Roles this user cannot see sort by their id.
   */
  const roleNameById = new Map(
    selectableRoles.map((role) => [role.id, role.name]),
  );
  const sortedEntries = entries.toSorted((a, b) =>
    (roleNameById.get(a.roleId) ?? a.roleId).localeCompare(
      roleNameById.get(b.roleId) ?? b.roleId,
    ),
  );

  const handleAdd = (roleId: string) =>
    setEntries((previous) => [
      ...previous,
      { roleId, choice: AccessChoice.Read },
    ]);

  const handleChange = (roleId: string, choice: AccessChoice) =>
    setEntries((previous) =>
      previous.map((entry) =>
        entry.roleId === roleId ? { ...entry, choice } : entry,
      ),
    );

  const handleRemove = (roleId: string) =>
    setEntries((previous) =>
      previous.filter((entry) => entry.roleId !== roleId),
    );

  return (
    <form onSubmit={handleSubmit}>
      {entries.length === 0 ? (
        <p className="text-neutral-500">
          Keine Rolle hat Zugriff. Die Vorlage ist damit nur für dich und für
          Nutzer mit der Berechtigung „Events verwalten“ sichtbar.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {sortedEntries.map((entry) => (
            <AccessRow
              key={entry.roleId}
              entry={entry}
              isRoleVisible={selectableRoles.some(
                (role) => role.id === entry.roleId,
              )}
              onChange={handleChange}
              onRemove={handleRemove}
            />
          ))}
        </ul>
      )}

      <PopoverBaseUI
        title="Rolle auswählen"
        trigger={
          <span className="mt-4 flex h-9 w-fit items-center gap-2 rounded-secondary border border-neutral-700 px-3 text-sm hover:bg-neutral-800">
            <FaUsers /> Rolle hinzufügen
          </span>
        }
        childrenClassName="max-h-96 overflow-auto"
      >
        <div className="flex flex-col gap-2">
          {addableRoles.length === 0 ? (
            <p className="text-neutral-500">
              Alle für dich sichtbaren Rollen sind bereits aufgeführt.
            </p>
          ) : (
            addableRoles
              .toSorted((a, b) => a.name.localeCompare(b.name))
              .map((role) => (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => handleAdd(role.id)}
                  className="group"
                >
                  {/* The badge's own popover trigger would nest buttons here */}
                  <SingleRoleBadge
                    roleId={role.id}
                    showPlaceholder
                    withPopover={false}
                    className="bg-transparent group-hover:bg-neutral-700/50 group-focus-visible:bg-neutral-700/50"
                  />
                </button>
              ))
          )}
        </div>
      </PopoverBaseUI>

      <div className="mt-4 flex justify-end">
        <Button2 type="submit" disabled={isPending}>
          {isPending ? <AsciiSpinner /> : <FaSave />}
          Speichern
        </Button2>
      </div>
    </form>
  );
};

interface AccessRowProps {
  readonly entry: Entry;
  readonly isRoleVisible: boolean;
  readonly onChange: (roleId: string, choice: AccessChoice) => void;
  readonly onRemove: (roleId: string) => void;
}

const AccessRow = ({
  entry,
  isRoleVisible,
  onChange,
  onRemove,
}: AccessRowProps) => {
  const selectId = useId();

  return (
    /*
      Wrapping instead of shrinking: the role badge sizes to its name, so a
      long one would otherwise push the controls out of the tile and scroll
      the whole page sideways.
    */
    <li className="flex flex-wrap items-center gap-2">
      <span className="min-w-0 flex-1 basis-48 overflow-hidden">
        {isRoleVisible ? (
          <SingleRoleBadge roleId={entry.roleId} showPlaceholder />
        ) : (
          /* A share with a role this user may not see — kept so saving cannot drop it */
          <span
            className="inline-flex h-8 items-center rounded-secondary bg-neutral-700/50 px-2 font-mono text-sm text-neutral-400"
            title={entry.roleId}
          >
            Nicht sichtbare Rolle
          </span>
        )}
      </span>

      <div className="flex flex-none items-center gap-2">
        <label htmlFor={selectId} className="sr-only">
          Zugriff
        </label>

        {/* Select is a full-width field, so its width comes from this wrapper */}
        <div className="w-52">
          <Select
            id={selectId}
            value={entry.choice}
            onChange={(event) =>
              onChange(entry.roleId, event.target.value as AccessChoice)
            }
          >
            {Object.values(AccessChoice).map((choice) => (
              <option key={choice} value={choice}>
                {ACCESS_CHOICE_LABELS[choice]}
              </option>
            ))}
          </Select>
        </div>

        <Button2
          type="button"
          variant={Button2Variant.IconOnly}
          tooltip="Rolle entfernen"
          onClick={() => onRemove(entry.roleId)}
        >
          <FaTrash />
        </Button2>
      </div>
    </li>
  );
};
