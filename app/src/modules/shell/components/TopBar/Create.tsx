"use client";

import { useAppsContext } from "@/modules/apps/components/AppsContext";
import type { ExternalApp } from "@/modules/apps/utils/types";
import { useAuthentication } from "@/modules/auth/hooks/useAuthentication";
import { Button2 } from "@/modules/common/components/Button2";
import {
  useCreateContext,
  type createForms,
} from "@/modules/common/components/CreateContext";
import { Link } from "@/modules/common/components/Link";
import { Popover, usePopover } from "@/modules/common/components/Popover";
import clsx from "clsx";
import { FaPlus } from "react-icons/fa";

interface Props {
  readonly className?: string;
  readonly enableProfitDistribution?: boolean;
}

export const Create = ({ className, enableProfitDistribution }: Props) => {
  const authentication = useAuthentication();

  const showCreateCitizen = Boolean(
    authentication && authentication.authorize("citizen", "create"),
  );
  const showCreateDistributionCycle = Boolean(
    enableProfitDistribution &&
      authentication &&
      authentication.authorize("profitDistributionCycle", "create"),
  );
  const showCreateOrganization = Boolean(
    authentication && authentication.authorize("organization", "create"),
  );
  const showCreateRole = Boolean(
    authentication && authentication.authorize("role", "manage"),
  );
  const showCreatePenaltyEntry = Boolean(
    authentication && authentication.authorize("penaltyEntry", "create"),
  );
  const showCreateTask = Boolean(
    authentication && authentication.authorize("task", "create"),
  );

  if (
    !showCreateCitizen &&
    !showCreateDistributionCycle &&
    !showCreateOrganization &&
    !showCreateRole &&
    !showCreatePenaltyEntry &&
    !showCreateTask
  )
    return null;

  return (
    <div className={clsx("h-full p-2", className)}>
      <Popover
        trigger={
          <Button2
            variant="secondary"
            colorSchema="interactionMuted"
            className="h-full px-6"
          >
            <FaPlus />
            Neu
          </Button2>
        }
        childrenClassName="flex flex-col gap-[1px] w-52"
        enableHover
      >
        <PopoverChildren
          showCreateCitizen={showCreateCitizen}
          showCreateDistributionCycle={showCreateDistributionCycle}
          showCreateOrganization={showCreateOrganization}
          showCreateRole={showCreateRole}
          showCreatePenaltyEntry={showCreatePenaltyEntry}
          showCreateTask={showCreateTask}
        />
      </Popover>
    </div>
  );
};

interface PopoverChildrenProps {
  readonly showCreateCitizen: boolean;
  readonly showCreateDistributionCycle: boolean;
  readonly showCreateOrganization: boolean;
  readonly showCreateRole: boolean;
  readonly showCreatePenaltyEntry: boolean;
  readonly showCreateTask: boolean;
}

const PopoverChildren = ({
  showCreateCitizen,
  showCreateDistributionCycle,
  showCreateOrganization,
  showCreateRole,
  showCreatePenaltyEntry,
  showCreateTask,
}: PopoverChildrenProps) => {
  const { closePopover } = usePopover();
  const { openCreateModal } = useCreateContext();
  const { apps } = useAppsContext();

  const handleClick = (modalId: keyof typeof createForms) => {
    openCreateModal(modalId);
    closePopover();
  };

  // @ts-expect-error Doesn't make any sense
  let items: (
    | {
        label: string;
        type: "button";
        modalId: keyof typeof createForms;
      }
    | {
        label: string;
        type: "link";
        href: string;
      }
  )[] = [
    ...(apps
      ?.filter((app): app is ExternalApp =>
        Boolean(
          "createLinks" in app && app.createLinks && app.createLinks.length > 0,
        ),
      )
      .flatMap((app) => {
        return app.createLinks!.map((link) => ({
          label: link.title,
          type: "link",
          href: `/app/external/${app.slug}/${link.slug}`,
        }));
      }) || []),
  ];

  if (showCreateCitizen)
    items.push({ label: "Citizen", type: "button", modalId: "citizen" });
  if (showCreateDistributionCycle)
    items.push({
      label: "SINcome-Zeitraum",
      type: "button",
      modalId: "profitDistributionCycle",
    });
  if (showCreateOrganization)
    items.push({
      label: "Organisation",
      type: "button",
      modalId: "organization",
    });
  if (showCreateRole)
    items.push({ label: "Rolle", type: "button", modalId: "role" });
  if (showCreatePenaltyEntry)
    items.push({
      label: "Strafpunkte",
      type: "button",
      modalId: "penaltyEntry",
    });
  if (showCreateTask)
    items.push({ label: "Task", type: "button", modalId: "task" });

  items = items.toSorted((a, b) => a.label.localeCompare(b.label));

  const className =
    "block hover:outline-interaction-700 focus-visible:outline-interaction-700 active:outline-interaction-500 outline outline-offset-4 outline-1 outline-transparent transition-colors rounded-primary overflow-hidden background-secondary group p-2 text-xs text-left";

  return (
    <div className="flex flex-col gap-[2px]">
      {items.map((item) => {
        if (item.type === "link")
          return (
            <Link
              key={item.label}
              onClick={() => closePopover()}
              href={item.href}
              className={className}
            >
              {item.label}
            </Link>
          );

        return (
          <button
            key={item.label}
            onClick={() => handleClick(item.modalId)}
            className={className}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
};
