"use client";

import { ActionErrorNote } from "@/modules/actions/components/ActionErrorNote";
import { useAction } from "@/modules/actions/utils/useAction";
import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import Modal from "@/modules/common/components/Modal";
import Note from "@/modules/common/components/Note";
import { RadioGroup } from "@/modules/common/components/form/RadioGroup";
import { WikiPageEventScope } from "@sam-monorepo/database/browser";
import { useState } from "react";
import { FaLock, FaSave } from "react-icons/fa";
import { updateEventWikiPagePermissions } from "../actions/updateEventWikiPagePermissions";
import type { WikiPageTargetOption } from "../utils/getWikiPageTargets";
import { WikiPageSelect } from "./WikiPageSelect";

interface Props {
  readonly className?: string;
  readonly pageId: string;
  readonly isRootPage: boolean;
  readonly readScope: WikiPageEventScope;
  readonly readScopePositionId: string | null;
  readonly editScope: WikiPageEventScope;
  readonly editScopePositionId: string | null;
  /** Lineup positions in depth-first tree order, for the POSITION scope */
  readonly positionOptions: WikiPageTargetOption[];
  /** Titles of the pages an INHERIT scope currently takes its value from */
  readonly inheritedFrom: {
    readonly read?: string;
    readonly edit?: string;
  };
  readonly parentTitle?: string;
}

/**
 * The event-mode permissions dialog: read and edit scopes instead of the
 * global wiki's role lists. The manage tier is not configurable — the
 * organizer, the event managers and `event;manage` always manage every
 * page.
 */
export const EventWikiPagePermissionsModal = ({
  className,
  pageId,
  isRootPage,
  readScope,
  readScopePositionId,
  editScope,
  editScopePositionId,
  positionOptions,
  inheritedFrom,
  parentTitle,
}: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const { state, formAction, isPending } = useAction(
    updateEventWikiPagePermissions,
    {
      errorToast: false,
      onSuccess: () => setIsOpen(false),
    },
  );

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
            initialScope={readScope}
            initialPositionId={readScopePositionId}
            allowInherit={!isRootPage}
            inheritedFrom={inheritedFrom.read}
            parentTitle={parentTitle}
            positionOptions={positionOptions}
          />

          <ScopeSection
            className="mt-6"
            legend="Bearbeiten"
            name="editScope"
            positionSelectName="editScopePositionId"
            initialScope={editScope}
            initialPositionId={editScopePositionId}
            allowInherit={!isRootPage}
            inheritedFrom={inheritedFrom.edit}
            parentTitle={parentTitle}
            positionOptions={positionOptions}
          />

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
  readonly initialScope: WikiPageEventScope;
  readonly initialPositionId: string | null;
  readonly allowInherit: boolean;
  readonly inheritedFrom?: string;
  readonly parentTitle?: string;
  readonly positionOptions: WikiPageTargetOption[];
}

const ScopeSection = ({
  className,
  legend,
  name,
  positionSelectName,
  initialScope,
  initialPositionId,
  allowInherit,
  inheritedFrom,
  parentTitle,
  positionOptions,
}: ScopeSectionProps) => {
  const [scope, setScope] = useState<string>(initialScope);

  return (
    <fieldset className={className}>
      <legend className="mb-2 text-sm text-white/40 font-mono uppercase">
        {legend}
      </legend>

      <RadioGroup
        name={name}
        value={scope}
        onChange={setScope}
        items={[
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
                : "Das Event hat noch keine Aufstellung — lege zuerst Positionen an.",
          },
          {
            value: WikiPageEventScope.ALL,
            label: "Alle",
            hint: "Alle mit Zugriff auf Events.",
          },
        ]}
      />

      {scope === WikiPageEventScope.POSITION && (
        <WikiPageSelect
          name={positionSelectName}
          defaultValue={initialPositionId ?? ""}
          required
          className="mt-2 w-full"
          targets={positionOptions}
          emptyOptionLabel="Position wählen …"
        />
      )}
    </fieldset>
  );
};
