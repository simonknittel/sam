import { CursorPaginationControls } from "@/modules/common/CursorPagination/CursorPaginationControls";
import { createCursorPaginationLoader } from "@/modules/common/CursorPagination/createCursorPaginationLoader";
import { CitizenLink } from "@/modules/common/components/CitizenLink";
import { TableRowAlignment, TRow } from "@/modules/common/components/Table";
import {
  TableTile,
  type TableColumn,
} from "@/modules/common/components/TableTile";
import { formatDate } from "@/modules/common/utils/formatDate";
import { parseAsString, type SearchParams } from "nuqs/server";
import { getManualNotifications } from "../queries/getManualNotifications";
import {
  MANUAL_NOTIFICATIONS_FROM_PARAM,
  MANUAL_NOTIFICATIONS_SEARCH_PARAM,
  MANUAL_NOTIFICATIONS_TO_PARAM,
} from "../utils/manualNotificationFilterParams";
import { ManualNotificationReceivers } from "./ManualNotificationReceivers";

const COLUMNS: TableColumn[] = [
  { key: "sentAt", label: "Gesendet", track: "150px", minWidth: 150 },
  { key: "sender", label: "Von", track: "150px", minWidth: 150 },
  { key: "title", label: "Titel", track: "200px", minWidth: 200 },
  { key: "body", label: "Text", track: "1fr", minWidth: 200 },
  {
    key: "receivers",
    label: "Empfänger",
    track: "minmax(250px,1fr)",
    minWidth: 250,
  },
];

const loadSearchParams = createCursorPaginationLoader({
  [MANUAL_NOTIFICATIONS_SEARCH_PARAM]: parseAsString,
  [MANUAL_NOTIFICATIONS_FROM_PARAM]: parseAsString,
  [MANUAL_NOTIFICATIONS_TO_PARAM]: parseAsString,
});

interface Props {
  readonly className?: string;
  readonly searchParams: Promise<SearchParams>;
}

export const ManualNotificationsTable = async ({
  className,
  searchParams,
}: Props) => {
  const { search, from, to, cursor, direction } =
    await loadSearchParams(searchParams);

  const { notifications, nextCursor, prevCursor } =
    await getManualNotifications(search, cursor, direction, from, to);

  return (
    <TableTile
      className={className}
      columns={COLUMNS}
      isEmpty={notifications.length === 0}
      emptyMessage="Keine Benachrichtigungen gefunden."
      bodyClassName="text-sm"
      footer={
        <CursorPaginationControls
          nextCursor={nextCursor}
          prevCursor={prevCursor}
        />
      }
    >
      {notifications.map((notification) => (
        <TRow key={notification.id} alignment={TableRowAlignment.Top}>
          <td className="leading-8">
            {formatDate(new Date(notification.created_at))}
          </td>

          <td className="truncate leading-8">
            <CitizenLink
              citizen={
                notification.created_by
                  ? { ...notification.created_by, deletedAt: null }
                  : null
              }
            />
          </td>

          <td title={notification.title} className="truncate leading-8">
            {notification.title}
          </td>

          <td title={notification.body} className="truncate leading-8">
            {notification.body}
          </td>

          <td>
            <ManualNotificationReceivers notification={notification} />
          </td>
        </TRow>
      ))}
    </TableTile>
  );
};
