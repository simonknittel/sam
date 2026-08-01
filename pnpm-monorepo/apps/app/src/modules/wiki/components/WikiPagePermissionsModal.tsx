"use client";

import { ActionErrorNote } from "@/modules/actions/components/ActionErrorNote";
import { useAction } from "@/modules/actions/utils/useAction";
import { CitizenInput } from "@/modules/citizen/components/CitizenInput";
import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import Modal from "@/modules/common/components/Modal";
import Note from "@/modules/common/components/Note";
import { RadioGroup } from "@/modules/common/components/form/RadioGroup";
import YesNoCheckbox from "@/modules/common/components/form/YesNoCheckbox";
import {
  WikiPageAdminability,
  WikiPageEditability,
  WikiPageVisibility,
} from "@sam-monorepo/database/browser";
import { useState } from "react";
import { FaLock, FaSave } from "react-icons/fa";
import { updateWikiPagePermissions } from "../actions/updateWikiPagePermissions";
import { WikiRoleSelector } from "./WikiRoleSelector";

interface Props {
  readonly className?: string;
  readonly page: {
    readonly id: string;
    readonly parentId: string | null;
    readonly ownerId: string | null;
    readonly visibility: WikiPageVisibility;
    readonly editability: WikiPageEditability;
    readonly adminability: WikiPageAdminability;
  };
  /** Handle of the effective owner (after inheritance), for display */
  readonly effectiveOwnerHandle: string | null;
  readonly readRoleIds: string[];
  readonly editRoleIds: string[];
  readonly adminRoleIds: string[];
  /** Titles of the pages supplying inherited settings, for display */
  readonly inheritedFrom: {
    readonly visibility?: string;
    readonly editability?: string;
    readonly adminability?: string;
  };
  readonly hasDescendants: boolean;
}

export const WikiPagePermissionsModal = ({
  className,
  page,
  effectiveOwnerHandle,
  readRoleIds,
  editRoleIds,
  adminRoleIds,
  inheritedFrom,
  hasDescendants,
}: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const isRoot = page.parentId === null;

  const [visibility, setVisibility] = useState<string>(page.visibility);
  const [editability, setEditability] = useState<string>(page.editability);
  const [adminability, setAdminability] = useState<string>(page.adminability);
  const [ownerMode, setOwnerMode] = useState<string>(
    page.ownerId ? "explicit" : "inherit",
  );

  const { state, formAction, isPending } = useAction(
    updateWikiPagePermissions,
    { errorToast: false, onSuccess: () => setIsOpen(false) },
  );

  return (
    <>
      <Button2
        type="button"
        onClick={() => setIsOpen(true)}
        variant={Button2Variant.IconOnly}
        className={className}
        tooltip="Berechtigungen bearbeiten"
      >
        <FaLock />
      </Button2>

      <Modal
        isOpen={isOpen}
        onRequestClose={() => setIsOpen(false)}
        className="w-160"
        heading={<h2>Berechtigungen</h2>}
      >
        <form action={formAction}>
          <input type="hidden" name="id" value={page.id} />

          <section className="border rounded-secondary border-neutral-700 p-4">
            <h3 className="font-bold text-lg">Sichtbarkeit</h3>

            <RadioGroup
              name="visibility"
              className="mt-2"
              value={visibility}
              onChange={setVisibility}
              items={[
                ...(isRoot
                  ? []
                  : [
                      {
                        value: WikiPageVisibility.INHERIT,
                        label: inheritedFrom.visibility
                          ? `Geerbt (von "${inheritedFrom.visibility}")`
                          : "Geerbt",
                      },
                    ]),
                {
                  value: WikiPageVisibility.PUBLIC,
                  label: "Öffentlich (alle mit Wiki-Zugriff)",
                },
                {
                  value: WikiPageVisibility.RESTRICTED,
                  label: "Eingeschränkt (Besitzer und ausgewählte Rollen)",
                },
              ]}
            />

            {visibility === WikiPageVisibility.RESTRICTED && (
              <>
                <WikiRoleSelector
                  className="mt-2"
                  inputName="readRole[]"
                  defaultValue={readRoleIds}
                />
                <p className="mt-1 text-xs text-neutral-400">
                  Ohne Rollen ist die Seite privat: Nur der Besitzer kann sie
                  sehen.
                </p>
              </>
            )}

            {hasDescendants && (
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="text-sm text-neutral-400">
                  Auch auf alle Unterseiten anwenden (setzt deren Sichtbarkeit
                  auf &quot;Geerbt&quot;)
                </span>
                <YesNoCheckbox name="cascadeVisibility" value="1" />
              </div>
            )}
          </section>

          <section className="border rounded-secondary border-neutral-700 p-4 mt-4">
            <h3 className="font-bold text-lg">Bearbeiten</h3>

            <RadioGroup
              name="editability"
              className="mt-2"
              value={editability}
              onChange={setEditability}
              items={[
                ...(isRoot
                  ? []
                  : [
                      {
                        value: WikiPageEditability.INHERIT,
                        label: inheritedFrom.editability
                          ? `Geerbt (von "${inheritedFrom.editability}")`
                          : "Geerbt",
                      },
                    ]),
                {
                  value: WikiPageEditability.ALL,
                  label: "Alle mit Wiki-Zugriff",
                },
                {
                  value: WikiPageEditability.RESTRICTED,
                  label: "Eingeschränkt (Besitzer und ausgewählte Rollen)",
                },
              ]}
            />

            {editability === WikiPageEditability.RESTRICTED && (
              <WikiRoleSelector
                className="mt-2"
                inputName="editRole[]"
                defaultValue={editRoleIds}
              />
            )}

            {hasDescendants && (
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="text-sm text-neutral-400">
                  Auch auf alle Unterseiten anwenden
                </span>
                <YesNoCheckbox name="cascadeEditability" value="1" />
              </div>
            )}
          </section>

          <section className="border rounded-secondary border-neutral-700 p-4 mt-4">
            <h3 className="font-bold text-lg">Verwalten</h3>
            <p className="text-sm text-neutral-400">
              Verwalter können Berechtigungen ändern sowie Seiten umbenennen,
              verschieben und löschen.
            </p>

            <RadioGroup
              name="adminability"
              className="mt-2"
              value={adminability}
              onChange={setAdminability}
              items={[
                ...(isRoot
                  ? []
                  : [
                      {
                        value: WikiPageAdminability.INHERIT,
                        label: inheritedFrom.adminability
                          ? `Geerbt (von "${inheritedFrom.adminability}")`
                          : "Geerbt",
                      },
                    ]),
                {
                  value: WikiPageAdminability.RESTRICTED,
                  label: "Eingeschränkt (Besitzer und ausgewählte Rollen)",
                },
              ]}
            />

            {adminability === WikiPageAdminability.RESTRICTED && (
              <WikiRoleSelector
                className="mt-2"
                inputName="adminRole[]"
                defaultValue={adminRoleIds}
              />
            )}

            {hasDescendants && (
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="text-sm text-neutral-400">
                  Auch auf alle Unterseiten anwenden
                </span>
                <YesNoCheckbox name="cascadeAdminability" value="1" />
              </div>
            )}
          </section>

          <section className="border rounded-secondary border-neutral-700 p-4 mt-4">
            <h3 className="font-bold text-lg">Besitzer</h3>
            <p className="text-sm text-neutral-400">
              Aktueller Besitzer:{" "}
              {effectiveOwnerHandle ?? "kein Besitzer (nur Wiki-Verwalter)"}
              {!page.ownerId && effectiveOwnerHandle ? " (geerbt)" : ""}. Der
              Besitzer hat immer alle Berechtigungen auf die Seite.
            </p>

            {isRoot ? (
              <input type="hidden" name="ownerMode" value="explicit" />
            ) : (
              <RadioGroup
                name="ownerMode"
                className="mt-2"
                value={ownerMode}
                onChange={setOwnerMode}
                items={[
                  {
                    value: "inherit",
                    label: "Von der übergeordneten Seite erben",
                  },
                  { value: "explicit", label: "Bestimmter Citizen" },
                ]}
              />
            )}

            {(isRoot || ownerMode === "explicit") && (
              <CitizenInput
                className="mt-2"
                name="newOwnerId"
                defaultValue={page.ownerId ?? undefined}
              />
            )}

            {hasDescendants && (
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="text-sm text-neutral-400">
                  Auch auf alle Unterseiten anwenden (setzt deren Besitzer auf
                  &quot;Geerbt&quot;)
                </span>
                <YesNoCheckbox name="cascadeOwner" value="1" />
              </div>
            )}
          </section>

          <Note
            type="info"
            className="mt-4"
            message="Es gilt: Verwalten schließt Bearbeiten ein, Bearbeiten schließt Sehen ein. Der Besitzer der Seite hat immer alle Berechtigungen."
          />

          <Button2 type="submit" disabled={isPending} className="mt-4 ml-auto">
            {isPending ? <AsciiSpinner /> : <FaSave />}
            Speichern
          </Button2>

          <ActionErrorNote className="mt-4" state={state} />
        </form>
      </Modal>
    </>
  );
};
