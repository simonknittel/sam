import clsx from "clsx";
import { FaExternalLinkAlt } from "react-icons/fa";
import { Button2, Button2Variant } from "./Button2";
import { Link } from "./Link";

interface Props {
  readonly className?: string;
  readonly href: string;
}

export const RSIButton = ({ className, href }: Props) => {
  return (
    <Button2
      as={Link}
      href={href}
      className={clsx("inline-flex", className)}
      rel="noreferrer"
      variant={Button2Variant.Secondary}
      colorSchema="rsi"
    >
      RSI <FaExternalLinkAlt />
    </Button2>
  );
};
