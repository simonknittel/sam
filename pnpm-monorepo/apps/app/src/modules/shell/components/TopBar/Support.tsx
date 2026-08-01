import { Link } from "@/modules/common/components/Link";
import { getWikiPageLinkTarget } from "@/modules/wiki/queries/getWikiSettings";
import { FaQuestionCircle } from "react-icons/fa";

export const Support = async () => {
  const target = await getWikiPageLinkTarget("support");
  if (!target) return null;

  return (
    <Link
      href={target.href}
      className="h-full px-4 flex items-center hover:bg-tertiary focus-visible:bg-tertiary"
      title="Support"
    >
      <FaQuestionCircle />
    </Link>
  );
};
