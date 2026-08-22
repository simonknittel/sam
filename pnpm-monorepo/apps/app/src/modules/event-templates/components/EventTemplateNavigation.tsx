import { SubNavigation } from "@/modules/common/components/SubNavigation";
import {
  getBriefingPath,
  getLineupPath,
  toTemplateContainer,
} from "@/modules/events/utils/eventContainer";
import clsx from "clsx";
import { FaBook, FaHome, FaShareAlt } from "react-icons/fa";
import { MdWorkspaces } from "react-icons/md";
import { getEventTemplatePath } from "../utils/eventTemplateConstraints";

interface Props {
  readonly className?: string;
  readonly templateId: string;
  /** The Freigabe tab only exists for those who may change the shares */
  readonly canManageShares: boolean;
}

export const EventTemplateNavigation = ({
  className,
  templateId,
  canManageShares,
}: Props) => {
  const container = toTemplateContainer(templateId);

  const pages = [
    {
      name: "Stammdaten",
      icon: <FaHome />,
      path: getEventTemplatePath(templateId),
    },
    {
      name: "Aufstellung",
      icon: <MdWorkspaces />,
      path: getLineupPath(container),
    },
    {
      name: "Briefing",
      icon: <FaBook />,
      path: getBriefingPath(container),
      matchesSubpaths: true,
    },
    ...(canManageShares
      ? [
          {
            name: "Freigabe",
            icon: <FaShareAlt />,
            path: `${getEventTemplatePath(templateId)}/sharing`,
          },
        ]
      : []),
  ];

  return (
    <SubNavigation
      pages={pages}
      className={clsx("flex flex-wrap", className)}
    />
  );
};
