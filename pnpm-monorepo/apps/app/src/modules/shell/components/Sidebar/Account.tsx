import { useAuthentication } from "@/modules/auth/hooks/useAuthentication";
import Avatar, { AvatarDecoration } from "@/modules/common/components/Avatar";
import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import { Link } from "@/modules/common/components/Link";
import { FaQuestionCircle } from "react-icons/fa";
import { LogoutButton } from "../LogoutButton";
import { Onboarding } from "./Onboarding";

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
    <div className="flex items-center justify-between gap-2 border-b border-neutral-800 p-4">
      <Link
        href="/app/account"
        // Without the label, the alt text of the avatar repeats the name
        aria-label={name ?? undefined}
        className="-m-2 flex min-w-0 items-center gap-4 rounded-secondary p-2 hover:bg-neutral-700 focus-visible:bg-neutral-700 active:bg-neutral-600"
      >
        <Avatar
          name={name}
          image={image}
          size={48}
          decoration={
            authentication.session.entity?.hasBirthdayToday
              ? AvatarDecoration.BirthdayHat
              : undefined
          }
        />

        <span className="truncate" title={name ?? undefined}>
          {name}
        </span>
      </Link>

      <div className="flex flex-none gap-1">
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

        <Onboarding />

        <LogoutButton />
      </div>
    </div>
  );
};
