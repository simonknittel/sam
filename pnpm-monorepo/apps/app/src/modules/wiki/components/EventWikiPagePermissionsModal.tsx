"use client";

import { ActionErrorNote } from "@/modules/actions/components/ActionErrorNote";
import { useAction } from "@/modules/actions/utils/useAction";
import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import Modal from "@/modules/common/components/Modal";
import Note from "@/modules/common/components/Note";
import { RadioGroup } from "@/modules/common/components/form/RadioGroup";
import {
  WikiPageEventScope,
  WikiPageUploadability,
} from "@sam-monorepo/database/browser";
import { useState } from "react";
import {
  FaGlobe,
  FaLock,
  FaPen,
  FaSave,
  FaSitemap,
  FaUsers,
  FaUserShield,
} from "react-icons/fa";
import { MdWorkspaces } from "react-icons/md";
import { updateEventWikiPagePermissions } from "../actions/updateEventWikiPagePermissions";
import type { WikiPageTargetOption } from "../utils/getWikiPageTargets";
import {
  isEventWikiScopeSubset,
  type EventWikiScopeSelection,
} from "../utils/isEventWikiScopeSubset";
import { WikiPageSelect } from "./WikiPageSelect";

interface FlatPosition {
  readonly id: string;
  readonly parentPositionId: string | null;
}

interface Props {
  readonly className?: string;
  readonly pageId: string;
  readonly isRootPage: boolean;
  readonly readScope: WikiPageEventScope;
  readonly readScopePositionId: string | null;
  readonly editScope: WikiPageEventScope;
  readonly imageUploadability: WikiPageUploadability;
  readonly attachmentUploadability: WikiPageUploadability;
  /** Lineup positions in depth-first tree order, for the POSITION scope */
  readonly positionOptions: WikiPageTargetOption[];
  /** Flat parent relations, for the subset checks */
  readonly positions: FlatPosition[];
  /** Titles of the pages an INHERIT setting currently takes its value from */
  readonly inheritedFrom: {
    readonly read?: string;
    readonly edit?: string;
    readonly imageUploadability?: string;
    readonly attachmentUploadability?: string;
  };
  /** The parent's effective scopes — what INHERIT resolves to here */
  readonly parentReadScope: EventWikiScopeSelection | null;
  readonly parentEditScope: EventWikiScopeSelection | null;
}

const MANAGERS_ONLY: EventWikiScopeSelection = {
  scope: WikiPageEventScope.MANAGERS,
  positionId: null,
};

/**
 * The event-mode permissions dialog: read and edit scopes plus the upload
 * tiers, instead of the global wiki's role lists. Styled like
 * `WikiPagePermissionsModal` so both dialogs read as one. The manage tier
 * is not configurable — the organizer, the event managers and
 * `event;manage` always manage every page. The edit scope only offers
 * subsets of the read scope (and resets to the managers when narrowing the
 * read scope invalidates it), mirroring the server-side validation.
 */
export const EventWikiPagePermissionsModal = ({
  className,
  pageId,
  isRootPage,
  readScope: initialReadScope,
  readScopePositionId: initialReadPositionId,
  editScope: initialEditScope,
  imageUploadability: initialImageUploadability,
  attachmentUploadability: initialAttachmentUploadability,
  positionOptions,
  positions,
  inheritedFrom,
  parentReadScope,
  parentEditScope,
}: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const [readScope, setReadScope] =
    useState<WikiPageEventScope>(initialReadScope);
  const [readPositionId, setReadPositionId] = useState(
    initialReadPositionId ?? "",
  );
  const [editScope, setEditScope] =
    useState<WikiPageEventScope>(initialEditScope);
  /**
   * A stored INHERIT on a root page (the schema default; the seed writes
   * RESTRICTED explicitly since the uploadability tiers reached event
   * pages) cannot be offered — the root has nothing to inherit from — so
   * show its effective meaning instead: managers only.
   */
  const initialUploadability = (value: WikiPageUploadability) =>
    isRootPage && value === WikiPageUploadability.INHERIT
      ? WikiPageUploadability.RESTRICTED
      : value;
  const [imageUploadability, setImageUploadability] =
    useState<WikiPageUploadability>(
      initialUploadability(initialImageUploadability),
    );
  const [attachmentUploadability, setAttachmentUploadability] =
    useState<WikiPageUploadability>(
      initialUploadability(initialAttachmentUploadability),
    );
  const { state, formAction, isPending } = useAction(
    updateEventWikiPagePermissions,
    {
      errorToast: false,
      onSuccess: () => setIsOpen(false),
    },
  );

  const effectiveRead = (
    scope: WikiPageEventScope,
    positionId: string,
  ): EventWikiScopeSelection =>
    scope === WikiPageEventScope.INHERIT
      ? (parentReadScope ?? MANAGERS_ONLY)
      : { scope, positionId: positionId || null };

  const currentEffectiveRead = effectiveRead(readScope, readPositionId);

  /**
   * An explicit edit scope POSITION always means the read scope's group, so
   * it is valid exactly while reading is limited to a group. INHERIT
   * resolves to the parent's effective edit scope, which the subset rule
   * checks like any other value.
   */
  const isEditChoiceAllowed = (
    scope: WikiPageEventScope,
    read: EventWikiScopeSelection,
  ) => {
    if (scope === WikiPageEventScope.POSITION)
      return read.scope === WikiPageEventScope.POSITION;
    return isEventWikiScopeSubset(
      scope === WikiPageEventScope.INHERIT
        ? (parentEditScope ?? MANAGERS_ONLY)
        : { scope, positionId: null },
      read,
      positions,
    );
  };

  /** Narrowing the read scope resets an edit choice it no longer contains */
  const handleReadChange = (
    nextScope: WikiPageEventScope,
    nextPositionId: string,
  ) => {
    setReadScope(nextScope);
    setReadPositionId(nextPositionId);

    if (
      !isEditChoiceAllowed(editScope, effectiveRead(nextScope, nextPositionId))
    )
      setEditScope(WikiPageEventScope.MANAGERS);
  };

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
          <input type="hidden" name="id" value={pageId} />

          <Note
            type="info"
            message={
              isRootPage
                ? "Der Lese-Scope der Briefing-Startseite entscheidet, wer den Briefing-Tab des Events sieht. Bearbeiten schließt Lesen ein und ist nie weiter gefasst als Lesen."
                : "Bearbeiten schließt Lesen ein und ist nie weiter gefasst als Lesen. Eine Unterseite gibt nie mehr als die Seite darüber: Wer die übergeordnete Seite nicht lesen darf, bekommt hier gar keine Berechtigung."
            }
          />

          <ScopeSection
            legend="Lesen"
            name="readScope"
            scope={readScope}
            onScopeChange={(next) => handleReadChange(next, readPositionId)}
            allowInherit={!isRootPage}
            inheritedFrom={inheritedFrom.read}
            positionHint={
              positionOptions.length > 0
                ? "Alle, die einer Position innerhalb der gewählten Aufstellungs-Gruppe zugewiesen sind."
                : "Das Event hat noch keine passende Aufstellungs-Gruppe."
            }
            isOptionAllowed={() => true}
            positionSelect={{
              name: "readScopePositionId",
              value: readPositionId,
              onChange: (next) => handleReadChange(readScope, next),
              options: positionOptions,
            }}
          />

          <ScopeSection
            legend="Bearbeiten"
            name="editScope"
            scope={editScope}
            onScopeChange={setEditScope}
            allowInherit={!isRootPage}
            inheritedFrom={inheritedFrom.edit}
            positionHint="Alle aus der für Lesen gewählten Aufstellungs-Gruppe."
            isOptionAllowed={(scope) =>
              isEditChoiceAllowed(scope, currentEffectiveRead)
            }
          />

          <section className="mt-8">
            <h3 className="font-bold text-lg font-mono uppercase">Hochladen</h3>
            <p className="text-sm text-neutral-400">
              Wer darf beim Bearbeiten Bilder bzw. Dateianhänge hochladen?
            </p>

            <h4 className="font-bold mt-4">Bilder</h4>
            <UploadabilityRadioGroup
              name="imageUploadability"
              value={imageUploadability}
              onChange={setImageUploadability}
              allowInherit={!isRootPage}
              inheritedFrom={inheritedFrom.imageUploadability}
            />

            <h4 className="font-bold mt-4">Dateianhänge</h4>
            <UploadabilityRadioGroup
              name="attachmentUploadability"
              value={attachmentUploadability}
              onChange={setAttachmentUploadability}
              allowInherit={!isRootPage}
              inheritedFrom={inheritedFrom.attachmentUploadability}
            />
          </section>

          <section className="mt-8">
            <h3 className="font-bold text-lg font-mono uppercase">Manager</h3>
            <p className="text-sm text-neutral-400">
              Der Event-Organisator, die Event-Manager und Rollen mit der
              &quot;Events verwalten&quot;-Berechtigung haben immer vollen
              Zugriff auf alle Seiten dieses Briefings.
            </p>
          </section>

          <Button2 type="submit" disabled={isPending} className="mt-8 ml-auto">
            {isPending ? <AsciiSpinner /> : <FaSave />}
            Speichern
          </Button2>

          <ActionErrorNote className="mt-4" state={state} />
        </form>
      </Modal>
    </>
  );
};

const inheritedHint = (sourceTitle: string | undefined) =>
  sourceTitle
    ? `Wie die übergeordnete Seite, aktuell geerbt von "${sourceTitle}".`
    : "Wie die übergeordnete Seite.";

interface ScopeSectionProps {
  readonly legend: string;
  readonly name: string;
  readonly scope: WikiPageEventScope;
  readonly onScopeChange: (scope: WikiPageEventScope) => void;
  readonly allowInherit: boolean;
  readonly inheritedFrom?: string;
  readonly positionHint: string;
  /** Drops scope options the subset rule forbids (the edit section) */
  readonly isOptionAllowed: (scope: WikiPageEventScope) => boolean;
  /** Only the read scope picks a group; edit follows the read's */
  readonly positionSelect?: {
    readonly name: string;
    readonly value: string;
    readonly onChange: (positionId: string) => void;
    readonly options: WikiPageTargetOption[];
  };
}

const ScopeSection = ({
  legend,
  name,
  scope,
  onScopeChange,
  allowInherit,
  inheritedFrom,
  positionHint,
  isOptionAllowed,
  positionSelect,
}: ScopeSectionProps) => {
  const items = [
    ...(allowInherit
      ? [
          {
            value: WikiPageEventScope.INHERIT,
            label: "Geerbt",
            icon: <FaSitemap />,
            hint: inheritedHint(inheritedFrom),
          },
        ]
      : []),
    {
      value: WikiPageEventScope.MANAGERS,
      label: "Manager",
      icon: <FaUserShield />,
      hint: "Nur der Organisator und die Manager des Events.",
    },
    {
      value: WikiPageEventScope.POSITION,
      label: "Aufstellung",
      icon: <MdWorkspaces />,
      hint: positionHint,
    },
    {
      value: WikiPageEventScope.PARTICIPANTS,
      label: "Teilnehmer",
      icon: <FaUsers />,
      hint: "Alle, die dem Event zugesagt haben.",
    },
    {
      value: WikiPageEventScope.ALL,
      label: "Alle",
      icon: <FaGlobe />,
      hint: "Alle mit Zugriff auf Events.",
    },
  ].filter((item) => isOptionAllowed(item.value));

  return (
    <section className="mt-8">
      <h3 className="font-bold text-lg font-mono uppercase">{legend}</h3>

      <RadioGroup
        name={name}
        className="mt-2"
        equalWidth
        value={scope}
        /** RadioGroup is string-typed; the items only carry enum values */
        onChange={(next) => onScopeChange(next as WikiPageEventScope)}
        items={items}
      />

      {positionSelect && scope === WikiPageEventScope.POSITION && (
        <WikiPageSelect
          name={positionSelect.name}
          value={positionSelect.value}
          onChange={(event) => positionSelect.onChange(event.target.value)}
          required
          className="mt-2 w-full"
          targets={positionSelect.options}
          emptyOptionLabel="Position wählen …"
        />
      )}
    </section>
  );
};

interface UploadabilityRadioGroupProps {
  readonly name: string;
  readonly value: WikiPageUploadability;
  readonly onChange: (value: WikiPageUploadability) => void;
  readonly allowInherit: boolean;
  readonly inheritedFrom?: string;
}

const UploadabilityRadioGroup = ({
  name,
  value,
  onChange,
  allowInherit,
  inheritedFrom,
}: UploadabilityRadioGroupProps) => {
  return (
    <RadioGroup
      name={name}
      className="mt-2"
      equalWidth
      value={value}
      /** RadioGroup is string-typed; the items only carry enum values */
      onChange={(next) => onChange(next as WikiPageUploadability)}
      items={[
        ...(allowInherit
          ? [
              {
                value: WikiPageUploadability.INHERIT,
                label: "Geerbt",
                icon: <FaSitemap />,
                hint: inheritedHint(inheritedFrom),
              },
            ]
          : []),
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
          hint: "Nur die Manager des Events.",
        },
      ]}
    />
  );
};
