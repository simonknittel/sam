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
import { FaLock, FaPen, FaSave, FaSitemap, FaUserShield } from "react-icons/fa";
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
  readonly editScopePositionId: string | null;
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
  readonly parentTitle?: string;
}

const MANAGERS_ONLY: EventWikiScopeSelection = {
  scope: WikiPageEventScope.MANAGERS,
  positionId: null,
};

/**
 * The event-mode permissions dialog: read and edit scopes plus the upload
 * tiers, instead of the global wiki's role lists. The manage tier is not
 * configurable — the organizer, the event managers and `event;manage`
 * always manage every page. The edit scope only offers subsets of the read
 * scope (and resets to the managers when narrowing the read scope
 * invalidates it), mirroring the server-side validation.
 */
export const EventWikiPagePermissionsModal = ({
  className,
  pageId,
  isRootPage,
  readScope: initialReadScope,
  readScopePositionId: initialReadPositionId,
  editScope: initialEditScope,
  editScopePositionId: initialEditPositionId,
  imageUploadability: initialImageUploadability,
  attachmentUploadability: initialAttachmentUploadability,
  positionOptions,
  positions,
  inheritedFrom,
  parentReadScope,
  parentEditScope,
  parentTitle,
}: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const [readScope, setReadScope] = useState<string>(initialReadScope);
  const [readPositionId, setReadPositionId] = useState(
    initialReadPositionId ?? "",
  );
  const [editScope, setEditScope] = useState<string>(initialEditScope);
  const [editPositionId, setEditPositionId] = useState(
    initialEditPositionId ?? "",
  );
  /**
   * Seeded root pages store INHERIT, which the root cannot offer (nothing to
   * inherit from) — show its effective meaning instead: managers only.
   */
  const initialUploadability = (value: WikiPageUploadability) =>
    isRootPage && value === WikiPageUploadability.INHERIT
      ? WikiPageUploadability.RESTRICTED
      : value;
  const [imageUploadability, setImageUploadability] = useState<string>(
    initialUploadability(initialImageUploadability),
  );
  const [attachmentUploadability, setAttachmentUploadability] =
    useState<string>(initialUploadability(initialAttachmentUploadability));
  const { state, formAction, isPending } = useAction(
    updateEventWikiPagePermissions,
    {
      errorToast: false,
      onSuccess: () => setIsOpen(false),
    },
  );

  const effectiveRead = (
    scope: string,
    positionId: string,
  ): EventWikiScopeSelection =>
    scope === WikiPageEventScope.INHERIT
      ? (parentReadScope ?? MANAGERS_ONLY)
      : {
          scope: scope as WikiPageEventScope,
          positionId: positionId || null,
        };

  const currentEffectiveRead = effectiveRead(readScope, readPositionId);

  const editSelection = (
    scope: string,
    positionId: string,
  ): EventWikiScopeSelection =>
    scope === WikiPageEventScope.INHERIT
      ? (parentEditScope ?? MANAGERS_ONLY)
      : {
          scope: scope as WikiPageEventScope,
          positionId: positionId || null,
        };

  /**
   * A POSITION edit selection without a picked position is still valid as
   * long as any position would be — the empty required select forces the
   * pick before submitting.
   */
  const isEditChoiceAllowed = (
    scope: string,
    positionId: string,
    read: EventWikiScopeSelection,
  ) => {
    if (scope === WikiPageEventScope.POSITION && !positionId)
      return allowedEditPositionOptions(read).length > 0;
    return isEventWikiScopeSubset(
      editSelection(scope, positionId),
      read,
      positions,
    );
  };

  const allowedEditPositionOptions = (read: EventWikiScopeSelection) =>
    positionOptions.filter((option) =>
      isEventWikiScopeSubset(
        { scope: WikiPageEventScope.POSITION, positionId: option.id },
        read,
        positions,
      ),
    );

  /** Narrowing the read scope resets an edit choice it no longer contains */
  const handleReadChange = (nextScope: string, nextPositionId: string) => {
    setReadScope(nextScope);
    setReadPositionId(nextPositionId);

    const nextRead = effectiveRead(nextScope, nextPositionId);
    if (!isEditChoiceAllowed(editScope, editPositionId, nextRead)) {
      setEditScope(WikiPageEventScope.MANAGERS);
      setEditPositionId("");
    } else if (
      editScope === WikiPageEventScope.POSITION &&
      editPositionId &&
      !isEventWikiScopeSubset(
        { scope: WikiPageEventScope.POSITION, positionId: editPositionId },
        nextRead,
        positions,
      )
    ) {
      setEditPositionId("");
    }
  };

  return (
    <>
      <Button2
        type="button"
        onClick={() => setIsOpen(true)}
        variant={Button2Variant.IconOnly}
        className={className}
        tooltip="Berechtigungen"
      >
        <FaLock />
      </Button2>

      <Modal
        isOpen={isOpen}
        onRequestClose={() => setIsOpen(false)}
        className="w-140"
        heading={<h2>Berechtigungen</h2>}
      >
        <form action={formAction}>
          <input type="hidden" name="id" value={pageId} />

          <ScopeSection
            legend="Lesen"
            name="readScope"
            positionSelectName="readScopePositionId"
            scope={readScope}
            positionId={readPositionId}
            onScopeChange={(next) => handleReadChange(next, readPositionId)}
            onPositionChange={(next) => handleReadChange(readScope, next)}
            allowInherit={!isRootPage}
            inheritedFrom={inheritedFrom.read}
            parentTitle={parentTitle}
            positionOptions={positionOptions}
            isOptionAllowed={() => true}
          />

          <ScopeSection
            className="mt-6"
            legend="Bearbeiten"
            name="editScope"
            positionSelectName="editScopePositionId"
            scope={editScope}
            positionId={editPositionId}
            onScopeChange={(next) => {
              setEditScope(next);
              if (next !== WikiPageEventScope.POSITION) setEditPositionId("");
            }}
            onPositionChange={setEditPositionId}
            allowInherit={!isRootPage}
            inheritedFrom={inheritedFrom.edit}
            parentTitle={parentTitle}
            positionOptions={allowedEditPositionOptions(currentEffectiveRead)}
            isOptionAllowed={(scope) =>
              isEditChoiceAllowed(scope, editPositionId, currentEffectiveRead)
            }
          />

          <section className="mt-6">
            <h3 className="text-sm text-white/40 font-mono uppercase">
              Hochladen
            </h3>
            <p className="mt-1 text-sm text-neutral-400">
              Wer darf beim Bearbeiten Bilder bzw. Dateianhänge hochladen?
              Verwalter dürfen immer hochladen.
            </p>

            <h4 className="font-bold mt-4">Bilder</h4>
            <UploadabilityRadioGroup
              name="imageUploadability"
              value={imageUploadability}
              onChange={setImageUploadability}
              allowInherit={!isRootPage}
              inheritedFrom={inheritedFrom.imageUploadability}
              parentTitle={parentTitle}
            />

            <h4 className="font-bold mt-4">Dateianhänge</h4>
            <UploadabilityRadioGroup
              name="attachmentUploadability"
              value={attachmentUploadability}
              onChange={setAttachmentUploadability}
              allowInherit={!isRootPage}
              inheritedFrom={inheritedFrom.attachmentUploadability}
              parentTitle={parentTitle}
            />
          </section>

          <Note
            type="info"
            className="mt-6"
            message={
              isRootPage
                ? "Der Lese-Scope der Briefing-Startseite entscheidet, wer den Briefing-Tab sieht. Organisator und Event-Verwalter haben immer vollen Zugriff. Bearbeiten schließt Lesen ein."
                : "Wer die übergeordnete Seite nicht lesen kann, erhält hier keinen Zugriff — egal was diese Seite einstellt. Organisator und Event-Verwalter haben immer vollen Zugriff. Bearbeiten schließt Lesen ein."
            }
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

interface ScopeSectionProps {
  readonly className?: string;
  readonly legend: string;
  readonly name: string;
  readonly positionSelectName: string;
  readonly scope: string;
  readonly positionId: string;
  readonly onScopeChange: (scope: string) => void;
  readonly onPositionChange: (positionId: string) => void;
  readonly allowInherit: boolean;
  readonly inheritedFrom?: string;
  readonly parentTitle?: string;
  readonly positionOptions: WikiPageTargetOption[];
  /** Drops scope options the subset rule forbids (the edit section) */
  readonly isOptionAllowed: (scope: string) => boolean;
}

const ScopeSection = ({
  className,
  legend,
  name,
  positionSelectName,
  scope,
  positionId,
  onScopeChange,
  onPositionChange,
  allowInherit,
  inheritedFrom,
  parentTitle,
  positionOptions,
  isOptionAllowed,
}: ScopeSectionProps) => {
  const items = [
    ...(allowInherit
      ? [
          {
            value: WikiPageEventScope.INHERIT,
            label: "Geerbt",
            hint: inheritedFrom
              ? `Übernimmt die Einstellung von „${inheritedFrom}“.`
              : `Übernimmt die Einstellung der übergeordneten Seite${parentTitle ? ` „${parentTitle}“` : ""}.`,
          },
        ]
      : []),
    {
      value: WikiPageEventScope.MANAGERS,
      label: "Nur Verwalter",
      hint: "Organisator, Event-Verwalter und Personen mit der Verwalten-Berechtigung für Events.",
    },
    {
      value: WikiPageEventScope.PARTICIPANTS,
      label: "Alle Teilnehmer",
      hint: "Alle, die dem Event auf Discord zugesagt haben.",
    },
    {
      value: WikiPageEventScope.POSITION,
      label: "Aufstellungs-Gruppe",
      hint:
        positionOptions.length > 0
          ? "Alle, die einer Position innerhalb der gewählten Gruppe zugewiesen sind."
          : "Das Event hat noch keine passende Aufstellungs-Gruppe.",
    },
    {
      value: WikiPageEventScope.ALL,
      label: "Alle",
      hint: "Alle mit Zugriff auf Events.",
    },
  ].filter((item) => isOptionAllowed(item.value));

  return (
    <fieldset className={className}>
      <legend className="mb-2 text-sm text-white/40 font-mono uppercase">
        {legend}
      </legend>

      <RadioGroup
        name={name}
        value={scope}
        onChange={onScopeChange}
        items={items}
      />

      {scope === WikiPageEventScope.POSITION && (
        <WikiPageSelect
          name={positionSelectName}
          value={positionId}
          onChange={(event) => onPositionChange(event.target.value)}
          required
          className="mt-2 w-full"
          targets={positionOptions}
          emptyOptionLabel="Position wählen …"
        />
      )}
    </fieldset>
  );
};

interface UploadabilityRadioGroupProps {
  readonly name: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly allowInherit: boolean;
  readonly inheritedFrom?: string;
  readonly parentTitle?: string;
}

const UploadabilityRadioGroup = ({
  name,
  value,
  onChange,
  allowInherit,
  inheritedFrom,
  parentTitle,
}: UploadabilityRadioGroupProps) => {
  return (
    <RadioGroup
      name={name}
      className="mt-2"
      equalWidth
      value={value}
      onChange={onChange}
      items={[
        ...(allowInherit
          ? [
              {
                value: WikiPageUploadability.INHERIT,
                label: "Geerbt",
                icon: <FaSitemap />,
                hint: inheritedFrom
                  ? `Übernimmt die Einstellung von „${inheritedFrom}“.`
                  : `Übernimmt die Einstellung der übergeordneten Seite${parentTitle ? ` „${parentTitle}“` : ""}.`,
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
          label: "Verwalter",
          icon: <FaUserShield />,
          hint: "Nur die Verwalter des Events.",
        },
      ]}
    />
  );
};
