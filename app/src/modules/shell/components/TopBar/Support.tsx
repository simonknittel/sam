import { Link } from "@/modules/common/components/Link";
import { FaQuestionCircle } from "react-icons/fa";

export const Support = () => {
  return (
    <Link
      href="/app/help/support"
      className="h-full px-4 flex items-center hover:bg-tertiary focus-visible:bg-tertiary"
      title="Support"
    >
      <FaQuestionCircle />
    </Link>
  );
};
