"use client";

import { runAction } from "@/modules/actions/utils/runAction";
import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import Modal from "@/modules/common/components/Modal";
import { VariantWithLogo } from "@/modules/fleet/components/VariantWithLogo";
import {
  EventPositionRoleMatch,
  type Citizen,
} from "@sam-monorepo/database/browser";
import { getCitizenDisplayName } from "@sam-monorepo/domain";
import clsx from "clsx";
import { useId, useState, useTransition } from "react";
import { FaPen } from "react-icons/fa";
import { resetEventPositionCitizenId } from "../actions/resetEventPositionCitizenId";
import { updateEventPositionCitizenId } from "../actions/updateEventPositionCitizenId";
import type {
  CheckedApplication,
  CheckedEventLineupCitizen,
  UnmetRequirements,
} from "../utils/checkRequirements";
import type { PositionType } from "./Position";
import { RequiredRoleBadges } from "./PositionRequiredRoles";

type DisplayedCitizen = Pick<Citizen, "id" | "handle" | "deletedAt">;

/** One citizen that the manager can assign */
interface Choice {
  readonly citizen: DisplayedCitizen;
  readonly unmetRequirements: UnmetRequirements;
}

const compareByCitizenDisplayName = (first: Choice, second: Choice) =>
  getCitizenDisplayName(first.citizen).localeCompare(
    getCitizenDisplayName(second.citizen),
  );

interface Props {
  readonly className?: string;
  readonly position: PositionType;
  readonly citizensSatisfyingRequirements: CheckedEventLineupCitizen[];
  readonly citizensNotSatisfyingRequirements: CheckedEventLineupCitizen[];
  readonly applicationsSatisfyingRequirements: CheckedApplication[];
  readonly applicationsNotSatisfyingRequirements: CheckedApplication[];
}

/**
 * The choices are in a modal and not in a select: for a citizen who does not
 * meet the requirements, the modal shows the missing ship and the missing
 * roles
 */
export const UpdateEventPositionCitizenId = ({
  className,
  position,
  citizensSatisfyingRequirements,
  citizensNotSatisfyingRequirements,
  applicationsSatisfyingRequirements,
  applicationsNotSatisfyingRequirements,
}: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  /** The citizen of the pending assignment, or null for the removal */
  const [pendingCitizenId, setPendingCitizenId] = useState<
    DisplayedCitizen["id"] | null
  >(null);

  const assignedCitizen = position.citizen ?? null;
  const assignedCitizenName = assignedCitizen
    ? getCitizenDisplayName(assignedCitizen)
    : null;

  const changeCitizen = (citizenId: DisplayedCitizen["id"] | null) => {
    const formData = new FormData();
    formData.set("positionId", position.id);
    if (citizenId) formData.set("citizenId", citizenId);
    setPendingCitizenId(citizenId);

    startTransition(async () => {
      const succeeded = await runAction(
        citizenId ? updateEventPositionCitizenId : resetEventPositionCitizenId,
        formData,
      );
      if (succeeded) setIsOpen(false);
    });
  };

  const sections = [
    {
      title: "Interessenten - Voraussetzungen erfüllt",
      choices: applicationsSatisfyingRequirements,
    },
    {
      title: "Interessenten - Voraussetzungen nicht erfüllt",
      choices: applicationsNotSatisfyingRequirements,
    },
    {
      title: "Alle Teilnehmer - Voraussetzungen erfüllt",
      choices: citizensSatisfyingRequirements,
    },
    {
      title: "Alle Teilnehmer - Voraussetzungen nicht erfüllt",
      choices: citizensNotSatisfyingRequirements,
    },
  ];

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        disabled={isPending}
        /**
         * A lineup holds one of these per position, so it names its own. A
         * label and not hidden text: the text of the page has the name of
         * each position only once.
         */
        aria-label={`Citizen für ${position.name}: ${assignedCitizenName ?? "-"}`}
        title={assignedCitizenName ?? undefined}
        className={clsx(
          "flex w-full cursor-pointer items-center justify-between gap-2 rounded-secondary bg-white/10 p-2 text-left text-neutral-100 outline-offset-2 outline-interaction-700 hover:bg-white/15 focus-visible:outline-2 active:bg-white/5 disabled:cursor-wait",
          className,
        )}
      >
        <span className="truncate">{assignedCitizenName ?? "-"}</span>
        {isPending ? (
          <AsciiSpinner />
        ) : (
          <FaPen className="flex-none text-sm text-neutral-400" />
        )}
      </button>

      <Modal
        isOpen={isOpen}
        onRequestClose={() => setIsOpen(false)}
        className="w-160"
        heading={<h2>Posten zuweisen</h2>}
      >
        <div className="flex items-center justify-between gap-4">
          <p className="min-w-0 truncate" title={assignedCitizenName ?? ""}>
            <span className="text-neutral-500">Zugewiesen: </span>
            {assignedCitizenName ?? "-"}
          </p>

          {assignedCitizen && (
            <Button2
              variant={Button2Variant.Secondary}
              onClick={() => changeCitizen(null)}
              disabled={isPending}
              className="flex-none"
            >
              {isPending && pendingCitizenId === null && <AsciiSpinner />}
              Entfernen
            </Button2>
          )}
        </div>

        <div className="mt-6 flex flex-col gap-6">
          {sections.map((section) => (
            <ChoiceSection
              key={section.title}
              title={section.title}
              position={position}
              choices={section.choices}
              assignedCitizenId={assignedCitizen?.id ?? null}
              pendingCitizenId={isPending ? pendingCitizenId : null}
              isPending={isPending}
              onAssign={changeCitizen}
            />
          ))}
        </div>
      </Modal>
    </>
  );
};

interface ChoiceSectionProps {
  readonly title: string;
  readonly position: PositionType;
  readonly choices: readonly Choice[];
  readonly assignedCitizenId: DisplayedCitizen["id"] | null;
  readonly pendingCitizenId: DisplayedCitizen["id"] | null;
  readonly isPending: boolean;
  readonly onAssign: (citizenId: DisplayedCitizen["id"]) => void;
}

const ChoiceSection = ({
  title,
  position,
  choices,
  assignedCitizenId,
  pendingCitizenId,
  isPending,
  onAssign,
}: ChoiceSectionProps) => {
  const headingId = useId();

  return (
    <section aria-labelledby={headingId}>
      <h3 id={headingId} className="font-mono text-xs text-white uppercase">
        {title}
      </h3>

      {choices.length > 0 ? (
        <ul className="mt-2 flex flex-col gap-1">
          {choices.toSorted(compareByCitizenDisplayName).map((choice) => (
            <ChoiceRow
              key={choice.citizen.id}
              position={position}
              choice={choice}
              isAssigned={choice.citizen.id === assignedCitizenId}
              isAssignmentPending={choice.citizen.id === pendingCitizenId}
              isPending={isPending}
              onAssign={onAssign}
            />
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-neutral-500">Niemand</p>
      )}
    </section>
  );
};

interface ChoiceRowProps {
  readonly position: PositionType;
  readonly choice: Choice;
  readonly isAssigned: boolean;
  readonly isAssignmentPending: boolean;
  readonly isPending: boolean;
  readonly onAssign: (citizenId: DisplayedCitizen["id"]) => void;
}

const ChoiceRow = ({
  position,
  choice,
  isAssigned,
  isAssignmentPending,
  isPending,
  onAssign,
}: ChoiceRowProps) => {
  const name = getCitizenDisplayName(choice.citizen);

  return (
    <li className="flex items-start justify-between gap-4 rounded-secondary bg-neutral-900/50 p-2">
      <div className="min-w-0">
        <p className="truncate font-bold" title={name}>
          {name}
        </p>
        <UnmetRequirementList
          position={position}
          unmetRequirements={choice.unmetRequirements}
        />
      </div>

      <Button2
        variant={Button2Variant.Secondary}
        onClick={() => onAssign(choice.citizen.id)}
        disabled={isAssigned || isPending}
        aria-label={`${name} zuweisen`}
        className="flex-none"
      >
        {isAssignmentPending && <AsciiSpinner />}
        {isAssigned ? "Zugewiesen" : "Zuweisen"}
      </Button2>
    </li>
  );
};

interface UnmetRequirementListProps {
  readonly position: PositionType;
  readonly unmetRequirements: UnmetRequirements;
}

/** With ANY, either no role or each role is missing, and one is enough */
const getMissingRolesLabel = (
  position: PositionType,
  missingRoleCount: number,
) => {
  if (missingRoleCount <= 1) return "Fehlende Rolle:";

  return position.requiredRoleMatch === EventPositionRoleMatch.ANY
    ? "Fehlende Rolle (eine davon):"
    : "Fehlende Rollen:";
};

const UnmetRequirementList = ({
  position,
  unmetRequirements,
}: UnmetRequirementListProps) => {
  const { isShipMissing, missingRoleIds } = unmetRequirements;
  if (!isShipMissing && missingRoleIds.length <= 0) return null;

  return (
    <ul className="mt-1 flex flex-col gap-1 text-sm">
      {isShipMissing && (
        <li className="flex flex-col gap-1">
          <span className="text-neutral-500">
            {position.requiredVariants.length > 1
              ? "Fehlendes Schiff (eines davon):"
              : "Fehlendes Schiff:"}
          </span>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {position.requiredVariants.map((requiredVariant) => (
              <VariantWithLogo
                key={requiredVariant.id}
                variant={requiredVariant.variant}
                manufacturer={requiredVariant.variant.series.manufacturer}
                size={32}
              />
            ))}
          </div>
        </li>
      )}

      {missingRoleIds.length > 0 && (
        <li className="flex flex-col gap-1">
          <span className="text-neutral-500">
            {getMissingRolesLabel(position, missingRoleIds.length)}
          </span>
          <RequiredRoleBadges roleIds={missingRoleIds} />
        </li>
      )}
    </ul>
  );
};
