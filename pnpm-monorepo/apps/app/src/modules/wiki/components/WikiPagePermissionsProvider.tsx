"use client";

import { ActionErrorNote } from "@/modules/actions/components/ActionErrorNote";
import { useAction } from "@/modules/actions/utils/useAction";
import { CitizenInput } from "@/modules/citizen/components/CitizenInput";
import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import { Button2 } from "@/modules/common/components/Button2";
import Modal from "@/modules/common/components/Modal";
import Note from "@/modules/common/components/Note";
import { RadioGroup } from "@/modules/common/components/form/RadioGroup";
import YesNoCheckbox from "@/modules/common/components/form/YesNoCheckbox";
import {
  WikiPageEditability,
  WikiPageUploadability,
  WikiPageVisibility,
} from "@sam-monorepo/database/browser";
import { useCallback, useState, type ReactNode } from "react";
import {
  FaGlobe,
  FaLock,
  FaPen,
  FaSave,
  FaSitemap,
  FaUser,
  FaUsers,
  FaUserShield,
} from "react-icons/fa";
import { updateWikiPagePermissions } from "../actions/updateWikiPagePermissions";
import type { WikiEffectivePermissions } from "../utils/resolveWikiPageEffectivePermissions";
import { WikiEffectivePermissionList } from "./WikiEffectivePermissionList";
import { WikiPagePermissionsOpenerProvider } from "./WikiPagePermissionsOpener";
import { WikiRoleSelector } from "./WikiRoleSelector";

interface Props {
  /** The page view the dialog's triggers live in */
  readonly children: ReactNode;
  readonly page: {
    readonly id: string;
    readonly parentId: string | null;
    readonly ownerId: string | null;
    readonly visibility: WikiPageVisibility;
    readonly editability: WikiPageEditability;
    readonly imageUploadability: WikiPageUploadability;
    readonly attachmentUploadability: WikiPageUploadability;
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
    readonly imageUploadability?: string;
    readonly attachmentUploadability?: string;
  };
  readonly parentTitle?: string;
  /** Roles allowed to read the parent page — read access only narrows */
  readonly parentReadRoleIds: string[];
  readonly effectivePermissions: WikiEffectivePermissions;
  readonly hasDescendants: boolean;
}

const CASCADE_LABEL = "Auch auf alle Unterseiten anwenden";
const EFFECTIVE_HEADING = "Effektiv (gespeicherter Stand):";
const NOBODY_LABEL = "Niemand außer den Wiki-Managern.";

/**
 * The role-model permissions dialog together with its open state. Rendered
 * only for viewers who may change the permissions — its role ids must not
 * reach anybody else — so its absence is what turns the visibility badge
 * into plain text.
 */
export const WikiPagePermissionsProvider = ({
  children,
  page,
  effectiveOwnerHandle,
  readRoleIds,
  editRoleIds,
  adminRoleIds,
  inheritedFrom,
  parentTitle,
  parentReadRoleIds,
  effectivePermissions,
  hasDescendants,
}: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const openPermissions = useCallback(() => setIsOpen(true), []);
  const isRoot = page.parentId === null;

  const [visibility, setVisibility] = useState<string>(page.visibility);
  const [editability, setEditability] = useState<string>(page.editability);
  const [imageUploadability, setImageUploadability] = useState<string>(
    page.imageUploadability,
  );
  const [attachmentUploadability, setAttachmentUploadability] =
    useState<string>(page.attachmentUploadability);
  const [ownerMode, setOwnerMode] = useState<string>(
    page.ownerId ? "explicit" : "inherit",
  );

  const { state, formAction, isPending } = useAction(
    updateWikiPagePermissions,
    { errorToast: false, onSuccess: () => setIsOpen(false) },
  );

  const inheritedHint = (sourceTitle: string | undefined) =>
    sourceTitle
      ? `Wie die übergeordnete Seite, aktuell geerbt von "${sourceTitle}".`
      : "Wie die übergeordnete Seite.";

  return (
    <WikiPagePermissionsOpenerProvider onOpen={openPermissions}>
      {children}

      <Modal
        isOpen={isOpen}
        onRequestClose={() => setIsOpen(false)}
        className="w-160"
        heading={<h2>Berechtigungen</h2>}
      >
        <form action={formAction}>
          <input type="hidden" name="id" value={page.id} />

          <Note
            type="info"
            message="Verwalten schließt Bearbeiten ein, Bearbeiten schließt Lesen ein. Eine Unterseite gibt nie mehr als die Seite darüber: Wer die übergeordnete Seite nicht lesen darf, bekommt hier gar keine Berechtigung."
          />

          <section className="mt-8">
            <h3 className="font-bold text-lg font-mono uppercase">Lesen</h3>

            <RadioGroup
              name="visibility"
              className="mt-2"
              equalWidth
              value={visibility}
              onChange={setVisibility}
              items={[
                /**
                 * Only top-level pages can be public: read access never
                 * widens downwards, so on a child page "public" would mean
                 * exactly what "inherited" already means.
                 */
                ...(isRoot
                  ? [
                      {
                        value: WikiPageVisibility.PUBLIC,
                        label: "Öffentlich",
                        icon: <FaGlobe />,
                        hint: "Alle mit Wiki-Zugriff können die Seite lesen.",
                      },
                    ]
                  : [
                      {
                        value: WikiPageVisibility.INHERIT,
                        label: "Geerbt",
                        icon: <FaSitemap />,
                        hint: inheritedHint(inheritedFrom.visibility),
                      },
                    ]),
                {
                  value: WikiPageVisibility.RESTRICTED,
                  label: "Eingeschränkt",
                  icon: <FaLock />,
                  hint: isRoot
                    ? "Nur der Besitzer, die Manager und ausgewählte Rollen."
                    : `Nur der Besitzer, die Manager und ausgewählte Rollen — zur Auswahl stehen nur Rollen, die auch ${parentTitle ? `"${parentTitle}"` : "die übergeordnete Seite"} lesen dürfen.`,
                },
              ]}
            />

            {visibility === WikiPageVisibility.RESTRICTED && (
              <>
                <WikiRoleSelector
                  className="mt-2"
                  inputName="readRole[]"
                  defaultValue={readRoleIds}
                  selectableRoleIds={isRoot ? undefined : parentReadRoleIds}
                />
                <p className="mt-1 text-xs text-neutral-400">
                  Ohne Rollen ist die Seite privat: Nur der Besitzer und die
                  Manager können sie lesen.
                </p>
              </>
            )}

            <WikiEffectivePermissionList
              className="mt-3"
              heading={EFFECTIVE_HEADING}
              entries={effectivePermissions.read}
              emptyLabel={NOBODY_LABEL}
            />

            {hasDescendants && (
              <div className="mt-3 flex items-center justify-between gap-2">
                <span className="text-sm text-neutral-400">
                  {`${CASCADE_LABEL} (setzt deren Sichtbarkeit auf "Geerbt")`}
                </span>
                <YesNoCheckbox name="cascadeVisibility" value="1" />
              </div>
            )}
          </section>

          <section className="mt-8">
            <h3 className="font-bold text-lg font-mono uppercase">
              Bearbeiten
            </h3>

            <RadioGroup
              name="editability"
              className="mt-2"
              equalWidth
              value={editability}
              onChange={setEditability}
              items={[
                ...(isRoot
                  ? []
                  : [
                      {
                        value: WikiPageEditability.INHERIT,
                        label: "Geerbt",
                        icon: <FaSitemap />,
                        hint: inheritedHint(inheritedFrom.editability),
                      },
                    ]),
                {
                  value: WikiPageEditability.ALL,
                  label: "Alle",
                  icon: <FaUsers />,
                  hint: "Alle mit Lese-Zugriff können die Seite bearbeiten.",
                },
                {
                  value: WikiPageEditability.RESTRICTED,
                  label: "Eingeschränkt",
                  icon: <FaLock />,
                  hint: isRoot
                    ? "Nur der Besitzer, die Manager und ausgewählte Rollen."
                    : `Nur der Besitzer, die Manager und ausgewählte Rollen — zur Auswahl stehen nur Rollen, die auch ${parentTitle ? `"${parentTitle}"` : "die übergeordnete Seite"} lesen dürfen.`,
                },
              ]}
            />

            {editability === WikiPageEditability.RESTRICTED && (
              <WikiRoleSelector
                className="mt-2"
                inputName="editRole[]"
                defaultValue={editRoleIds}
                selectableRoleIds={isRoot ? undefined : parentReadRoleIds}
              />
            )}

            <WikiEffectivePermissionList
              className="mt-3"
              heading={EFFECTIVE_HEADING}
              entries={effectivePermissions.edit}
              emptyLabel={NOBODY_LABEL}
            />

            {hasDescendants && (
              <div className="mt-3 flex items-center justify-between gap-2">
                <span className="text-sm text-neutral-400">
                  {CASCADE_LABEL}
                </span>
                <YesNoCheckbox name="cascadeEditability" value="1" />
              </div>
            )}
          </section>

          <section className="mt-8">
            <h3 className="font-bold text-lg font-mono uppercase">Hochladen</h3>
            <p className="text-sm text-neutral-400">
              Wer darf beim Bearbeiten Bilder bzw. Dateianhänge hochladen?
            </p>

            <h4 className="font-bold mt-4">Bilder</h4>

            <RadioGroup
              name="imageUploadability"
              className="mt-2"
              equalWidth
              value={imageUploadability}
              onChange={setImageUploadability}
              items={[
                ...(isRoot
                  ? []
                  : [
                      {
                        value: WikiPageUploadability.INHERIT,
                        label: "Geerbt",
                        icon: <FaSitemap />,
                        hint: inheritedHint(inheritedFrom.imageUploadability),
                      },
                    ]),
                {
                  value: WikiPageUploadability.EDITORS,
                  label: "Bearbeiter",
                  icon: <FaPen />,
                  hint: "Alle, die die Seite bearbeiten dürfen.",
                },
                {
                  value: WikiPageUploadability.RESTRICTED,
                  label: "Manager",
                  icon: <FaUserShield />,
                  hint: "Nur die Manager der Seite.",
                },
              ]}
            />

            {hasDescendants && (
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="text-sm text-neutral-400">
                  {CASCADE_LABEL}
                </span>
                <YesNoCheckbox name="cascadeImageUploadability" value="1" />
              </div>
            )}

            <h4 className="font-bold mt-4">Dateianhänge</h4>

            <RadioGroup
              name="attachmentUploadability"
              className="mt-2"
              equalWidth
              value={attachmentUploadability}
              onChange={setAttachmentUploadability}
              items={[
                ...(isRoot
                  ? []
                  : [
                      {
                        value: WikiPageUploadability.INHERIT,
                        label: "Geerbt",
                        icon: <FaSitemap />,
                        hint: inheritedHint(
                          inheritedFrom.attachmentUploadability,
                        ),
                      },
                    ]),
                {
                  value: WikiPageUploadability.EDITORS,
                  label: "Bearbeiter",
                  icon: <FaPen />,
                  hint: "Alle, die die Seite bearbeiten dürfen.",
                },
                {
                  value: WikiPageUploadability.RESTRICTED,
                  label: "Manager",
                  icon: <FaUserShield />,
                  hint: "Nur die Manager der Seite.",
                },
              ]}
            />

            {hasDescendants && (
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="text-sm text-neutral-400">
                  {CASCADE_LABEL}
                </span>
                <YesNoCheckbox
                  name="cascadeAttachmentUploadability"
                  value="1"
                />
              </div>
            )}
          </section>

          <section className="mt-8">
            <h3 className="font-bold text-lg font-mono uppercase">Manager</h3>
            <p className="text-sm text-neutral-400">
              Manager können Berechtigungen ändern sowie Seiten umbenennen,
              verschieben und löschen. Wer eine Seite verwaltet, verwaltet immer
              auch alle ihre Unterseiten.
            </p>

            <WikiEffectivePermissionList
              className="mt-3"
              heading="Immer (von übergeordneten Seiten):"
              entries={effectivePermissions.inheritedAdmin}
              emptyLabel={NOBODY_LABEL}
            />

            <p className="mt-3 text-sm text-neutral-400">
              Zusätzliche Manager dieser Seite und ihrer Unterseiten:
            </p>

            <WikiRoleSelector
              className="mt-2"
              inputName="adminRole[]"
              defaultValue={adminRoleIds}
              selectableRoleIds={isRoot ? undefined : parentReadRoleIds}
            />

            {hasDescendants && (
              <div className="mt-3 flex items-center justify-between gap-2">
                <span className="text-sm text-neutral-400">
                  Zusätzliche Manager der Unterseiten entfernen
                </span>
                <YesNoCheckbox name="cascadeAdminRoles" value="1" />
              </div>
            )}
          </section>

          <section className="mt-8">
            <h3 className="font-bold text-lg font-mono uppercase">Besitzer</h3>
            <p className="text-sm text-neutral-400">
              Aktueller Besitzer:{" "}
              {effectiveOwnerHandle ?? "kein Besitzer (nur Wiki-Manager)"}
              {!page.ownerId && effectiveOwnerHandle ? " (geerbt)" : ""}. Der
              Besitzer hat immer alle Berechtigungen auf die Seite.
            </p>

            {isRoot ? (
              <input type="hidden" name="ownerMode" value="explicit" />
            ) : (
              <RadioGroup
                name="ownerMode"
                className="mt-2"
                equalWidth
                value={ownerMode}
                onChange={setOwnerMode}
                items={[
                  {
                    value: "inherit",
                    label: "Geerbt",
                    icon: <FaSitemap />,
                    hint: "Der Besitzer der übergeordneten Seite besitzt auch diese Seite.",
                  },
                  {
                    value: "explicit",
                    label: "Citizen",
                    icon: <FaUser />,
                    hint: "Ein bestimmter Citizen besitzt diese Seite. Besitzer übergeordneter Seiten bleiben trotzdem Manager.",
                  },
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
                  {`${CASCADE_LABEL} (setzt deren Besitzer auf "Geerbt")`}
                </span>
                <YesNoCheckbox name="cascadeOwner" value="1" />
              </div>
            )}
          </section>

          <Button2 type="submit" disabled={isPending} className="mt-8 ml-auto">
            {isPending ? <AsciiSpinner /> : <FaSave />}
            Speichern
          </Button2>

          <ActionErrorNote className="mt-4" state={state} />
        </form>
      </Modal>
    </WikiPagePermissionsOpenerProvider>
  );
};
