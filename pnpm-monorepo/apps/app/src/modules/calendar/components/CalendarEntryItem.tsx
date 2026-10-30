import "server-only";

import { Event } from "@/modules/events/components/Event";
import type { CalendarEntry } from "@sam-monorepo/application";
import { CalendarEntryType } from "@sam-monorepo/domain";
import { CalendarEntryRow } from "./CalendarEntryRow";

interface Props {
  readonly entry: CalendarEntry;
  /** The position in the list: the first event cards load their images first */
  readonly index: number;
}

/** An event shows the card of the events list, each other entry a row */
export const CalendarEntryItem = ({ entry, index }: Props) => {
  if (entry.type === CalendarEntryType.Event)
    return (
      <Event
        event={entry.event}
        index={index}
        hasCancelledParticipation={entry.hasCancelledParticipation}
        isNew={entry.isNew}
      />
    );

  return <CalendarEntryRow entry={entry} />;
};
