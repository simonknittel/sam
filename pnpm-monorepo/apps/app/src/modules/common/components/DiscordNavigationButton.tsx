import clsx from "clsx";
import { FaDiscord } from "react-icons/fa";
import { Link } from "./Link";

interface Props {
  readonly className?: string;
  readonly path: string;
}

export const DiscordNavigationButton = ({ className, path }: Props) => {
  const href = `https://discord.com/${path}`;

  return (
    <Link
      href={href}
      className={clsx(
        className,
        "flex h-8 items-center justify-center gap-2 border border-neutral-500 px-3 font-mono text-neutral-500 uppercase first:rounded-l-secondary last:rounded-r-secondary hover:border-neutral-300 hover:text-neutral-300 active:border-neutral-300 active:text-neutral-300",
      )}
      rel="noreferrer"
    >
      <FaDiscord />
      Discord
    </Link>
  );
};
