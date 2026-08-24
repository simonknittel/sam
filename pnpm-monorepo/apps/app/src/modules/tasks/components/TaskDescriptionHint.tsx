import { Link } from "@/modules/common/components/Link";
import { TASK_DESCRIPTION_MAX_LENGTH } from "../utils/taskConstraints";

/** The hint below the description field of a task. */
export const TaskDescriptionHint = () => {
  return (
    <>
      optional, max. {TASK_DESCRIPTION_MAX_LENGTH.toLocaleString("de-DE")}{" "}
      Zeichen,{" "}
      <Link
        href="https://github.github.com/gfm/"
        target="_blank"
        className="text-brand-red-500 hover:text-brand-red-300 focus-visible:text-brand-red-300"
      >
        GitHub Flavored Markdown-Support
      </Link>
    </>
  );
};
