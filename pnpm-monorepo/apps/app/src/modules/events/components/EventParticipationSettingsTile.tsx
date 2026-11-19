import { Tile } from "@/modules/common/components/Tile";
import clsx from "clsx";
import { SETTINGS_SECTIONS } from "../utils/settingsSections";
import { UpdateEventApplicationRequired } from "./UpdateEventApplicationRequired";
import { UpdateEventParticipationEnabled } from "./UpdateEventParticipationEnabled";

interface Props {
  readonly className?: string;
  readonly event: {
    readonly id: string;
    readonly participationEnabled: boolean;
    readonly applicationRequired: boolean;
    /** The active sign-ups that the switch to false cancels */
    readonly activeParticipantCount: number;
  };
  /** The rule of the participation switch in `updateEvent()` */
  readonly canSwitchParticipation: boolean;
}

/**
 * The participation and the application switch of the settings page of an
 * event. Each switch saves at each change.
 */
export const EventParticipationSettingsTile = ({
  className,
  event,
  canSwitchParticipation,
}: Props) => {
  return (
    <Tile
      id={SETTINGS_SECTIONS.participation.id}
      heading={SETTINGS_SECTIONS.participation.label}
      className={clsx(className)}
    >
      {canSwitchParticipation && (
        <>
          <h3>Teilnahme</h3>
          <p className="mt-1 text-sm text-neutral-400">
            Mitglieder können sich anmelden und für Posten der Aufstellung
            eingetragen werden. Ohne Teilnahme sind die Aufstellung, die
            Teilnehmer und die Flotte der Teilnehmer ausgeblendet; die Freigabe
            der Aufstellung bleibt gespeichert.
          </p>

          <UpdateEventParticipationEnabled
            eventId={event.id}
            participationEnabled={event.participationEnabled}
            activeParticipantCount={event.activeParticipantCount}
            className="mt-2"
          />
        </>
      )}

      <h3 className={clsx({ "mt-6": canSwitchParticipation })}>
        Teilnahmeanfragen
      </h3>
      <p className="mt-1 text-sm text-neutral-400">
        Mitglieder können sich nicht selbst anmelden, sondern fragen die
        Teilnahme an. Ein Manager nimmt jede Anfrage an oder lehnt sie ab.
        Manager und eingeladene Mitglieder können sich direkt anmelden. Beim
        Abschalten werden die offenen Anfragen angenommen.
      </p>

      <UpdateEventApplicationRequired
        eventId={event.id}
        applicationRequired={event.applicationRequired}
        className="mt-2"
      />
    </Tile>
  );
};
