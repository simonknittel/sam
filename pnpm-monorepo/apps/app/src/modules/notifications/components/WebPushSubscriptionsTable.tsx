import { TRow } from "@/modules/common/components/Table";
import {
  TableTile,
  type TableColumn,
} from "@/modules/common/components/TableTile";
import { UserAgentCell } from "@/modules/common/components/UserAgentCell";
import { formatDate } from "@/modules/common/utils/formatDate";
import type { OwnWebPushSubscription } from "@sam-monorepo/application";
import { formatWebPushService } from "../utils/formatWebPushService";
import { CurrentBrowserBadge } from "./CurrentBrowserBadge";
import { DeleteWebPushSubscriptionButton } from "./DeleteWebPushSubscriptionButton";

const COLUMNS: TableColumn[] = [
  {
    key: "userAgent",
    label: "Browser",
    track: "minmax(160px,1fr)",
    minWidth: 160,
  },
  { key: "pushService", label: "Push-Dienst", track: "140px", minWidth: 140 },
  { key: "status", label: "Status", track: "130px", minWidth: 130 },
  { key: "createdAt", label: "Aktiviert am", track: "150px", minWidth: 150 },
  {
    key: "actions",
    label: "Aktionen",
    track: "130px",
    minWidth: 130,
    headerClassName: "sr-only",
  },
];

interface Props {
  readonly className?: string;
  readonly subscriptions: readonly OwnWebPushSubscription[];
}

export const WebPushSubscriptionsTable = ({
  className,
  subscriptions,
}: Props) => {
  return (
    <TableTile
      className={className}
      heading="Aktivierte Browser"
      columns={COLUMNS}
      isEmpty={subscriptions.length === 0}
      emptyMessage="Benachrichtigungen sind in keinem Browser aktiviert."
      bodyClassName="text-sm"
    >
      {subscriptions.map((subscription) => (
        <WebPushSubscriptionRow
          key={subscription.id}
          subscription={subscription}
        />
      ))}
    </TableTile>
  );
};

interface WebPushSubscriptionRowProps {
  readonly subscription: OwnWebPushSubscription;
}

const WebPushSubscriptionRow = ({
  subscription,
}: WebPushSubscriptionRowProps) => {
  const pushService = formatWebPushService(subscription.endpoint);

  return (
    <TRow className="h-10">
      <UserAgentCell userAgent={subscription.userAgent} />

      <td className="truncate" title={pushService ?? undefined}>
        {pushService}
      </td>

      <td>
        <CurrentBrowserBadge subscriptionId={subscription.id} />
      </td>

      <td>{formatDate(subscription.createdAt)}</td>

      <td>
        <DeleteWebPushSubscriptionButton subscriptionId={subscription.id} />
      </td>
    </TRow>
  );
};
