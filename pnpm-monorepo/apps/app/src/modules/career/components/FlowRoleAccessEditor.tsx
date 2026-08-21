"use client";

import { ActionErrorNote } from "@/modules/actions/components/ActionErrorNote";
import { useAction } from "@/modules/actions/utils/useAction";
import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import { PopoverBaseUI } from "@/modules/common/components/PopoverBaseUI";
import { Select } from "@/modules/common/components/form/Select";
import { SingleRoleBadge } from "@/modules/roles/components/SingleRoleBadge";
import { FlowRoleAccessType } from "@sam-monorepo/database/browser";
import { useId, useState } from "react";
import { FaSave, FaTrash, FaUsers } from "react-icons/fa";
import { updateFlowRoleAccess } from "../actions/updateFlowRoleAccess";

/** "Kein Zugriff" is the absence of a row, so it needs a value of its own */
enum AccessChoice {
  None = "none",
  Read = "read",
  Update = "update",
}

const ACCESS_CHOICE_LABELS: Record<AccessChoice, string> = {
  [AccessChoice.None]: "Kein Zugriff",
  [AccessChoice.Read]: "Lesen",
  [AccessChoice.Update]: "Bearbeiten",
};

interface Entry {
  readonly roleId: string;
  readonly choice: AccessChoice;
}

interface SelectableRole {
  readonly id: string;
  readonly name: string;
}

interface Props {
  readonly flowId: string;
  readonly roleAccess: readonly {
    readonly roleId: string;
    readonly type: FlowRoleAccessType;
  }[];
  /** Roles the current user may see (`otherRole;read;roleId=…`) */
  readonly selectableRoles: readonly SelectableRole[];
}

export const FlowRoleAccessEditor = ({
  flowId,
  roleAccess,
  selectableRoles,
}: Props) => {
  /**
   * Seeded from the stored rows rather than from the visible roles, so a
   * grant to a role the current user cannot see stays listed instead of
   * being dropped on the next save.
   */
  const [entries, setEntries] = useState<Entry[]>(() =>
    roleAccess.map((access) => ({
      roleId: access.roleId,
      choice:
        access.type === FlowRoleAccessType.UPDATE
          ? AccessChoice.Update
          : AccessChoice.Read,
    })),
  );

  const { state, formAction, isPending } = useAction(updateFlowRoleAccess, {
    errorToast: false,
  });

  const addableRoles = selectableRoles.filter(
    (role) => !entries.some((entry) => entry.roleId === role.id),
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
    <form action={formAction}>
      <input type="hidden" name="flowId" value={flowId} />

      {entries.length === 0 ? (
        <p className="text-neutral-500">
          Keine Rolle hat Zugriff. Der Karrierebaum ist damit nur für Nutzer mit
          der Berechtigung „Karrierebäume verwalten“ sichtbar.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {entries.map((entry) => (
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

      <ActionErrorNote className="mt-4" state={state} />

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
    <li className="flex items-center gap-2">
      <span className="min-w-0 flex-1">
        {isRoleVisible ? (
          <SingleRoleBadge roleId={entry.roleId} showPlaceholder />
        ) : (
          /* A grant to a role this user may not see — kept so saving cannot drop it */
          <span
            className="inline-flex h-8 items-center rounded-secondary bg-neutral-700/50 px-2 font-mono text-sm text-neutral-400"
            title={entry.roleId}
          >
            Nicht sichtbare Rolle
          </span>
        )}
      </span>

      <label htmlFor={selectId} className="sr-only">
        Zugriff
      </label>

      <Select
        id={selectId}
        className="w-48 flex-none"
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

      {entry.choice === AccessChoice.Read && (
        <input type="hidden" name="readRoleId[]" value={entry.roleId} />
      )}
      {entry.choice === AccessChoice.Update && (
        <input type="hidden" name="updateRoleId[]" value={entry.roleId} />
      )}

      <Button2
        type="button"
        variant={Button2Variant.IconOnly}
        tooltip="Rolle entfernen"
        onClick={() => onRemove(entry.roleId)}
        className="flex-none"
      >
        <FaTrash />
      </Button2>
    </li>
  );
};
