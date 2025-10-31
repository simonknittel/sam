import { useAuthentication } from "@/modules/auth/hooks/useAuthentication";
import Avatar from "@/modules/common/components/Avatar";
import { Button2 } from "@/modules/common/components/Button2";
import { Link } from "@/modules/common/components/Link";
import clsx from "clsx";
import { FaBell, FaUser } from "react-icons/fa";
import { LogoutButton } from "../LogoutButton";

export const Account = () => {
  const authentication = useAuthentication();
  if (!authentication) return null;

  const name =
    authentication.session.user.name || authentication.session.discordId;

  const image = authentication ? authentication.session.user.image : undefined;

  return (
    <div
      className={clsx(
        "flex items-center justify-between border-b border-neutral-800 p-4",
      )}
    >
      <div className="flex items-center gap-4">
        <div className="overflow-hidden rounded-secondary">
          <Avatar name={name} image={image} size={48} />
        </div>

        <div>
          <p>{name}</p>
        </div>
      </div>

      <div className="flex gap-1">
        <Button2
          as={Link}
          href="/app/account/notifications"
          title="Benachrichtigungen"
          variant="secondary"
        >
          <FaBell />
        </Button2>

        <Button2 as={Link} href="/app/account" title="Account">
          <FaUser />
        </Button2>

        <LogoutButton />
      </div>
    </div>
  );
};
