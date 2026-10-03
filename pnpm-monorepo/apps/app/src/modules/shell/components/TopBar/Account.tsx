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
        "cursor-pointer rounded-r-primary p-2 hover:bg-tertiary focus-visible:bg-tertiary",
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
          className="mt-4 w-full"
          entityId={authentication.session.entity.id}
        />
      )}

      <AccountSettings className="mt-2 w-full" />

      <Logout className="mt-2 w-full" />
    </PopoverBaseUI>
  );
};
