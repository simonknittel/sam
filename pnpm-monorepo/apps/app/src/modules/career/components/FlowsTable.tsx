import { createLoader, type SearchParams } from "nuqs/server";
import { getManageableFlows } from "../queries/getManageableFlows";
import {
  FLOW_QUERY_PARAM,
  FLOW_STATUS_PARAM,
  FlowStatus,
  flowFilterParsers,
} from "../utils/flowFilterParams";
import { FlowsTableClient } from "./FlowsTableClient";

const loadSearchParams = createLoader(flowFilterParsers);

const EMPTY_MESSAGE_BY_STATUS: Record<FlowStatus, string> = {
  [FlowStatus.Active]: "Es gibt noch keinen Karrierebaum.",
  [FlowStatus.Deleted]: "Es wurde kein Karrierebaum gelöscht.",
  [FlowStatus.All]: "Es gibt noch keinen Karrierebaum.",
};

interface Props {
  readonly searchParams: Promise<SearchParams>;
}

export const FlowsTable = async ({ searchParams }: Props) => {
  const { [FLOW_STATUS_PARAM]: status, [FLOW_QUERY_PARAM]: query } =
    await loadSearchParams(searchParams);

  const flows = await getManageableFlows(status, query);

  /**
   * A reorder renumbers the whole list, so it may only be derived from a
   * table showing all live flows and nothing else.
   */
  const canReorder = status === FlowStatus.Active && !query;

  return (
    <FlowsTableClient
      flows={flows}
      canReorder={canReorder}
      emptyMessage={
        query
          ? "Kein Karrierebaum passt zu dieser Suche."
          : EMPTY_MESSAGE_BY_STATUS[status]
      }
    />
  );
};
