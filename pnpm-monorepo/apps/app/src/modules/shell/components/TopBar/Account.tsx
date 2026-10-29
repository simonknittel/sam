import { requireAuthenticationPage } from "@/modules/auth/server";
import Avatar, { AvatarDecoration } from "@/modules/common/components/Avatar";
import { PopoverBaseUI } from "@/modules/common/components/PopoverBaseUI";
import clsx from "clsx";
import { AccountProfilePopover } from "./AccountProfilePopover";
import { AccountSettings } from "./AccountSettings";
import { Logout } from "./Logout";

interface Props {
  readonly className?: string;
}

export const Account = async ({ className }: Props) => {
  const authentication = await requireAuthenticationPage();

  const name =
    authentication.session.user.name || authentication.session.discordId;

  const image = authentication ? authentication.session.user.image : undefined;

  const decoration = authentication.session.entity?.hasBirthdayToday
    ? AvatarDecoration.BirthdayHat
    : undefined;

  const trigger = (
    <Avatar name={name} image={image} size={32} decoration={decoration} />
  );

  const triggerClassName = clsx(
    "cursor-pointer rounded-r-primary p-2 hover:bg-tertiary focus-visible:bg-tertiary",
    className,
  );

  if (authentication.session.entity)
    return (
      <AccountProfilePopover
        citizenId={authentication.session.entity.id}
        trigger={trigger}
        triggerClassName={triggerClassName}
      />
    );

  /** A user without a citizen has no profile */
  return (
    <PopoverBaseUI
      title="Account"
      trigger={trigger}
      triggerClassName={triggerClassName}
      triggerTitle="Account"
      childrenClassName="w-64"
    >
      <div className="flex items-center gap-4">
        <Avatar name={name} image={image} size={64} />

        <div>
          <p className="text-lg">{name}</p>
        </div>
      </div>

      <AccountSettings className="mt-4 w-full" />

      <Logout className="mt-2 w-full" />
    </PopoverBaseUI>
  );
};
