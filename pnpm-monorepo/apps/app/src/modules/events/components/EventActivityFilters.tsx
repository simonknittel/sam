import {
  ACTIVITY_ACTOR_PARAM,
  ACTIVITY_FROM_PARAM,
  ACTIVITY_TO_PARAM,
  ACTIVITY_TYPE_PARAM,
} from "@/modules/activity/utils/activityFilterParams";
import { DateRangeFilter } from "@/modules/common/components/layouts/SidebarLayout/Filters/DateRangeFilter";
import { MultiSelectComboboxFilter } from "@/modules/common/components/layouts/SidebarLayout/Filters/MultiSelectComboboxFilter";
import type { Entity } from "@sam-monorepo/database/client";
import {
  EVENT_ACTIVITY_TYPE_LABELS,
  EVENT_SCHEDULE_TYPE_LABEL,
  EventActivitySourceKey,
} from "../activity/eventActivityTypes";

interface Props {
  readonly actors: Pick<Entity, "id" | "handle">[];
}

export const EventActivityFilters = ({ actors }: Props) => {
  const typeItems = [
    ...Object.entries(EVENT_ACTIVITY_TYPE_LABELS).map(([value, label]) => ({
      value,
      label,
    })),
    {
      value: EventActivitySourceKey.Schedule,
      label: EVENT_SCHEDULE_TYPE_LABEL,
    },
  ];

  const actorItems = actors.map((actor) => ({
    value: actor.id,
    label: actor.handle || actor.id,
  }));

  return (
    <>
      <DateRangeFilter
        fromName={ACTIVITY_FROM_PARAM}
        toName={ACTIVITY_TO_PARAM}
        label="Zeitraum"
        resetCursorPagination
      />

      <MultiSelectComboboxFilter
        name={ACTIVITY_TYPE_PARAM}
        label="Typ"
        items={typeItems}
        placeholder="Alle"
        resetCursorPagination
      />

      <MultiSelectComboboxFilter
        name={ACTIVITY_ACTOR_PARAM}
        label="Akteur"
        items={actorItems}
        placeholder="Alle"
        resetCursorPagination
      />
    </>
  );
};
