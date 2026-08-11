import { Link } from "@/modules/common/components/Link";
import { getWikiPageLinkTarget } from "@/modules/wiki/queries/getWikiSettings";
import { FaQuestionCircle } from "react-icons/fa";

export const Support = async () => {
  const target = await getWikiPageLinkTarget("support");
  if (!target) return null;

  return (
    <Link
      href={target.href}
      prefetch={false}
      className="h-full px-4 flex items-center text-neutral-500 hover:bg-tertiary hover:text-white focus-visible:bg-tertiary focus-visible:text-white"
      title="Support"
    >
      <FaQuestionCircle />
    </Link>
  );
};
