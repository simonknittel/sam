import { RadioFilter } from "@/modules/common/components/layouts/SidebarLayout/Filters/RadioFilter";
import { SingleSelectComboboxFilter } from "@/modules/common/components/layouts/SidebarLayout/Filters/SingleSelectComboboxFilter";
import { TextSearchFilter } from "@/modules/common/components/layouts/SidebarLayout/Filters/TextSearchFilter";
import { getEventTemplateOwners } from "../queries/getEventTemplates";
import { getEventTemplateViewer } from "../queries/getEventTemplateViewer";
import {
  EVENT_TEMPLATE_OWNER_PARAM,
  EVENT_TEMPLATE_QUERY_PARAM,
  EVENT_TEMPLATE_SHARING_PARAM,
  EVENT_TEMPLATE_STATUS_PARAM,
  EventTemplateSharing,
  EventTemplateStatus,
} from "../utils/eventTemplateFilterParams";

/**
 * The owner filter only exists for `event;manage` holders, who see every
 * template anyway — for everyone else the list is already narrowed to their
 * own and their shared ones, so filtering by owner could only ever hide
 * rows, never reveal any.
 */
export const EventTemplatesFilters = async () => {
  const [viewer, owners] = await Promise.all([
    getEventTemplateViewer(),
    getEventTemplateOwners(),
  ]);

  return (
    <>
      <TextSearchFilter
        name={EVENT_TEMPLATE_QUERY_PARAM}
        label="Name oder Beschreibung"
        placeholder="Suche..."
      />

      <RadioFilter
        name={EVENT_TEMPLATE_SHARING_PARAM}
        label="Typ"
        items={[
          { value: EventTemplateSharing.All, label: "Alle", default: true },
          { value: EventTemplateSharing.Personal, label: "Persönlich" },
          { value: EventTemplateSharing.Shared, label: "Geteilt" },
        ]}
      />

      <RadioFilter
        name={EVENT_TEMPLATE_STATUS_PARAM}
        label="Status"
        items={[
          { value: EventTemplateStatus.Active, label: "Aktiv", default: true },
          { value: EventTemplateStatus.Deleted, label: "Gelöscht" },
          { value: EventTemplateStatus.All, label: "Alle" },
        ]}
      />

      {viewer?.hasEventManage && owners.length > 0 && (
        <SingleSelectComboboxFilter
          name={EVENT_TEMPLATE_OWNER_PARAM}
          label="Besitzer"
          placeholder="Citizen suchen..."
          items={[
            { value: "", label: "Alle" },
            ...owners.map((owner) => ({
              value: owner.id,
              label: owner.handle ?? owner.id,
            })),
          ]}
        />
      )}
    </>
  );
};
