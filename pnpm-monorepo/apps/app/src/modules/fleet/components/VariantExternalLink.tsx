import { Link } from "@/modules/common/components/Link";
import type { VariantExternalLink as VariantExternalLinkRow } from "@sam-monorepo/database/browser";
import { FaExternalLinkAlt } from "react-icons/fa";

interface Props {
  readonly link: Pick<VariantExternalLinkRow, "serviceName" | "url">;
}

/** A link of a variant to an external service. It opens in a new tab. */
export const VariantExternalLink = ({ link }: Props) => {
  return (
    <Link
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-1 text-sm text-interaction-500 hover:text-interaction-300 focus-visible:text-interaction-300 active:text-interaction-700"
      title={link.url}
    >
      {link.serviceName}
      <FaExternalLinkAlt className="size-3" />
    </Link>
  );
};
