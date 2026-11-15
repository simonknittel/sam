import clsx from "clsx";
import { formatUserAgent } from "../utils/formatUserAgent";

interface Props {
  readonly className?: string;
  /** The raw `User-Agent` header, or null when it is unknown */
  readonly userAgent: string | null;
}

/**
 * The table cell of a user agent: the browser and the operating system, the
 * raw value on hover
 */
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
