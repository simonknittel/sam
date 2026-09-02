import { requireAuthentication } from "@/modules/auth/server";
import Avatar, { AvatarDecoration } from "@/modules/common/components/Avatar";
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

  const decoration = authentication.session.entity?.hasBirthdayToday
    ? AvatarDecoration.BirthdayHat
    : undefined;

  return (
    <PopoverBaseUI
      title="Account"
      trigger={
        <Avatar name={name} image={image} size={32} decoration={decoration} />
      }
      triggerClassName={clsx(
        "p-2 rounded-r-primary cursor-pointer hover:bg-tertiary focus-visible:bg-tertiary",
        className,
      )}
      triggerTitle="Account"
      childrenClassName="w-64"
    >
      <div className="flex items-center gap-4">
        <Avatar name={name} image={image} size={64} decoration={decoration} />

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
