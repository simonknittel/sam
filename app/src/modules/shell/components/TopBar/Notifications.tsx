import { Link } from "@/modules/common/components/Link";
import { FaBell } from "react-icons/fa";

export const Notifications = () => {
  // TODO: Implement popover for on-site notifications (make use of TanStack Query with onfocus refetching)

  return (
    <Link
      href="/app/account/notifications"
      className="h-full px-4 flex items-center hover:background-tertiary focus-visible:background-tertiary"
      title="Benachrichtigungen"
    >
      <FaBell />
    </Link>
  );
};
