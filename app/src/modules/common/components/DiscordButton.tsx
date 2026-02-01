import clsx from "clsx";
import { FaDiscord } from "react-icons/fa";
import { Button2, Button2Variant } from "./Button2";
import { Link } from "./Link";

interface Props {
  readonly className?: string;
  readonly path: string;
}

export const DiscordButton = ({ className, path }: Props) => {
  const href = `https://discord.com/${path}`;
  // const urlScheme = `discord://-/${path}`;

  return (
    <Button2
      as={Link}
      href={href}
      className={clsx(className)}
      rel="noreferrer"
      colorSchema="discord"
      variant={Button2Variant.Secondary}
    >
      <FaDiscord />
      Discord
    </Button2>
  );
};
