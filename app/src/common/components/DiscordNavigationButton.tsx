import clsx from "clsx";
import { FaDiscord } from "react-icons/fa";
import { Link } from "./Link";

type Props = Readonly<{
  className?: string;
  path: string;
}>;

export const DiscordNavigationButton = ({ className, path }: Props) => {
  const href = `https://discord.com/${path}`;
  // const urlScheme = `discord://-/${path}`;

  return (
    <Link
      href={href}
      className={clsx(
        className,
        "first:rounded-l border last:rounded-r h-8 flex items-center justify-center px-3 gap-2 uppercase border-neutral-500 text-neutral-500 hover:border-neutral-300 active:border-neutral-300 hover:text-neutral-300 active:text-neutral-300",
      )}
      rel="noreferrer"
    >
      <FaDiscord />
      Discord
    </Link>
  );
};
