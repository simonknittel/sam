import clsx from "clsx";
import { formatUserAgent } from "../utils/formatUserAgent";

interface Props {
  readonly className?: string;
  readonly userAgent: string | null;
}

export const UserAgentCell = ({ className, userAgent }: Props) => {
  const text = formatUserAgent(userAgent) ?? userAgent;

  return (
    <td
      className={clsx("truncate", { "text-neutral-500": !text }, className)}
      title={userAgent ?? undefined}
    >
      {text ?? "Unbekannt"}
    </td>
  );
};
