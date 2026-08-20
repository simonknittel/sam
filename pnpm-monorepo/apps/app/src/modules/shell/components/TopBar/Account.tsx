import { requireAuthentication } from "@/modules/auth/server";
import Avatar from "@/modules/common/components/Avatar";
import { PopoverBaseUI } from "@/modules/common/components/PopoverBaseUI";
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
    <PopoverBaseUI
      trigger={
        <div className="overflow-hidden rounded-secondary">
          <Avatar name={name} image={image} size={32} />
        </div>
      }
      triggerClassName={clsx(
        "p-2 rounded-r-primary cursor-pointer hover:bg-tertiary focus-visible:bg-tertiary",
        className,
      )}
      triggerTitle="Account"
      childrenClassName="w-64"
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
    </PopoverBaseUI>
  );
};
