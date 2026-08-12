import { useAuthentication } from "@/modules/auth/hooks/useAuthentication";
import Avatar from "@/modules/common/components/Avatar";
import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import { Link } from "@/modules/common/components/Link";
import clsx from "clsx";
import { FaQuestionCircle, FaUser } from "react-icons/fa";
import { LogoutButton } from "../LogoutButton";
import { Notifications } from "./Notifications";

interface Props {
  readonly supportHref: string | null;
}

export const Account = ({ supportHref }: Props) => {
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
        {supportHref && (
          <Button2
            as={Link}
            href={supportHref}
            title="Support"
            variant={Button2Variant.Secondary}
          >
            <FaQuestionCircle />
          </Button2>
        )}

        <Notifications />

        <Button2 as={Link} href="/app/account" title="Account">
          <FaUser />
        </Button2>

        <LogoutButton />
      </div>
    </div>
  );
};
