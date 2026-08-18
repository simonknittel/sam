import {
  ACTIVITY_ACTOR_PARAM,
  ACTIVITY_FROM_PARAM,
  ACTIVITY_TO_PARAM,
  ACTIVITY_TYPE_PARAM,
} from "@/modules/activity/utils/activityFilterParams";
import { DateRangeFilter } from "@/modules/common/components/layouts/SidebarLayout/Filters/DateRangeFilter";
import { MultiSelectComboboxFilter } from "@/modules/common/components/layouts/SidebarLayout/Filters/MultiSelectComboboxFilter";
import { ORGANIZATION_ACTIVITY_TYPE_LABELS } from "@/modules/organizations/activity/organizationActivityTypes";
import { ROLE_ACTIVITY_TYPE_LABELS } from "@/modules/roles/activity/roleActivityTypes";
import type { Entity } from "@sam-monorepo/database/client";

const TYPE_GROUP_ORGANIZATIONS = "Organisationen";
const TYPE_GROUP_ROLES = "Rollen";

interface Props {
  readonly actors: Pick<Entity, "id" | "handle">[];
}

export const SpynetActivityFilters = ({ actors }: Props) => {
  const typeItems = [
    ...Object.entries(ORGANIZATION_ACTIVITY_TYPE_LABELS).map(
      ([value, label]) => ({
        value,
        label,
        group: TYPE_GROUP_ORGANIZATIONS,
      }),
    ),
    ...Object.entries(ROLE_ACTIVITY_TYPE_LABELS).map(([value, label]) => ({
      value,
      label,
      group: TYPE_GROUP_ROLES,
    })),
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
