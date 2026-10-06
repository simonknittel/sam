import { authenticate } from "@/modules/auth/server";
import { createLoader, type SearchParams } from "nuqs/server";
import { getEventTemplates } from "../queries/getEventTemplates";
import { getEventTemplateViewer } from "../queries/getEventTemplateViewer";
import {
  EVENT_TEMPLATE_OWNER_PARAM,
  EVENT_TEMPLATE_QUERY_PARAM,
  EVENT_TEMPLATE_SHARING_PARAM,
  EVENT_TEMPLATE_STATUS_PARAM,
  eventTemplateFilterParsers,
  EventTemplateStatus,
} from "../utils/eventTemplateFilterParams";
import { EventTemplatesTableClient } from "./EventTemplatesTableClient";

const loadSearchParams = createLoader(eventTemplateFilterParsers);

const EMPTY_MESSAGE_BY_STATUS: Record<EventTemplateStatus, string> = {
  [EventTemplateStatus.Active]: "Es gibt noch keine Event-Vorlage.",
  [EventTemplateStatus.Deleted]: "Es wurde keine Event-Vorlage gelöscht.",
  [EventTemplateStatus.All]: "Es gibt noch keine Event-Vorlage.",
};

interface Props {
  readonly searchParams: Promise<SearchParams>;
}

export const EventTemplatesTable = async ({ searchParams }: Props) => {
  const searchParameters = await loadSearchParams(searchParams);
  const status = searchParameters[EVENT_TEMPLATE_STATUS_PARAM];
  const sharing = searchParameters[EVENT_TEMPLATE_SHARING_PARAM];
  const ownerId = searchParameters[EVENT_TEMPLATE_OWNER_PARAM];
  const query = searchParameters[EVENT_TEMPLATE_QUERY_PARAM];

  const authentication = await authenticate();
  const [viewer, entries, canCreate] = await Promise.all([
    getEventTemplateViewer(),
    getEventTemplates({ status, sharing, ownerId, query }),
    authentication
      ? authentication.authorize("event", "create")
      : Promise.resolve(false),
  ]);

  return (
    <EventTemplatesTableClient
      entries={entries}
      showOwner={viewer?.hasEventManage === true}
      canCreate={canCreate}
      emptyMessage={
        query
          ? "Keine Event-Vorlage passt zu dieser Suche."
          : EMPTY_MESSAGE_BY_STATUS[status]
      }
    />
  );
};
