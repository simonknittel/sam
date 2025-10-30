import { requireAuthentication } from "@/modules/auth/server";
import Avatar from "@/modules/common/components/Avatar";
import { Popover } from "@/modules/common/components/Popover";
import clsx from "clsx";
import { AccountSettings } from "./AccountSettings";
import { Logout } from "./Logout";
import { SpynetProfileLink } from "./SpynetProfileLink";

interface Props {
  readonly className?: string;
}

export const Account = async ({ className }: Props) => {
  const authentication = await requireAuthentication();

  const name =
    authentication.session.user.name || authentication.session.discordId;

  const image = authentication ? authentication.session.user.image : undefined;

  return (
    <Popover
      trigger={
        <button
          type="button"
          className={clsx(
            "p-2 rounded-r-primary hover:background-tertiary focus-visible:background-tertiary",
            className,
          )}
        >
          <div className="overflow-hidden rounded-secondary">
            <Avatar name={name} image={image} size={32} />
          </div>
        </button>
      }
      childrenClassName="w-64"
      enableHover
    >
      <div className="flex items-center gap-4">
        <div className="overflow-hidden rounded-secondary">
          <Avatar name={name} image={image} size={64} />
        </div>

        <div>
          <p className="text-lg">{name}</p>
        </div>
      </div>

      {authentication.session.entity?.id && (
        <SpynetProfileLink
          className="w-full mt-4"
          entityId={authentication.session.entity.id}
        />
      )}

      <AccountSettings className="w-full mt-2" />

      <Logout className="w-full mt-2" />
    </Popover>
  );
};
