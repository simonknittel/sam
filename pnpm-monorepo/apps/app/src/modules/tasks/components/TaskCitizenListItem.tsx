import { CitizenAvatarSize } from "@/modules/common/components/CitizenAvatarSize";
import { CitizenLink } from "@/modules/common/components/CitizenLink";
import type { VisibleTask } from "@sam-monorepo/application";
import clsx from "clsx";

interface Props {
  readonly className?: string;
  /** The assignments and the completionists select the same fields */
  readonly citizen: VisibleTask["completionists"][number];
}

export const TaskCitizenListItem = ({ className, citizen }: Props) => {
  return (
    <li
      className={clsx(
        "flex min-h-10 items-center rounded-secondary bg-white/5 px-2 py-1",
        className,
      )}
    >
      <CitizenLink
        citizen={citizen}
        avatarSize={CitizenAvatarSize.List}
        className="min-w-0 wrap-break-word"
      />
    </li>
  );
};
