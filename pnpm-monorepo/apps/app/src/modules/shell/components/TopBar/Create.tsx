"use client";

import { useAppsContext } from "@/modules/apps/components/AppsContext";
import type { ExternalApp } from "@/modules/apps/utils/types";
import { useAuthentication } from "@/modules/auth/hooks/useAuthentication";
import {
  Button2,
  Button2ColorSchema,
  Button2Variant,
} from "@/modules/common/components/Button2";
import {
  useCreateContext,
  type createForms,
} from "@/modules/common/components/CreateContext";
import { Link } from "@/modules/common/components/Link";
import {
  PopoverBaseUI,
  usePopoverBaseUI,
} from "@/modules/common/components/PopoverBaseUI";
import type { ComponentProps } from "react";
import { FaPlus } from "react-icons/fa";

type PopoverProps = ComponentProps<typeof PopoverBaseUI>;

interface Props {
  readonly className?: string;
  readonly triggerClassName?: string;
  readonly side?: PopoverProps["side"];
  readonly positionerClassName?: string;
  readonly open?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
  /** Called after a click on an item, after the popover closed */
  readonly onSelect?: () => void;
}

export const Create = ({
  className,
  triggerClassName = "h-full px-6",
  side,
  positionerClassName,
  open,
  onOpenChange,
  onSelect,
}: Props) => {
  const authentication = useAuthentication();

  const showCreateCitizen = Boolean(
    authentication && authentication.authorize("citizen", "create"),
  );
  const showCreateDistributionCycle = Boolean(
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
  const showCreateEvent = Boolean(
    authentication && authentication.authorize("event", "create"),
  );
  const showCreateSilcTransaction = Boolean(
    authentication &&
    authentication.authorize("silcTransactionOfOtherCitizen", "create"),
  );
  const showCreateWikiPage = Boolean(authentication);
  const showCreateFlow = Boolean(
    authentication && authentication.authorize("career", "manage"),
  );
  /** Same gate as creating an event: a template is a blueprint of one */
  const showCreateEventTemplate = showCreateEvent;
  const showCreateManualNotification = Boolean(
    authentication && authentication.authorize("manualNotification", "manage"),
  );

  if (
    !showCreateFlow &&
    !showCreateManualNotification &&
    !showCreateCitizen &&
    !showCreateDistributionCycle &&
    !showCreateOrganization &&
    !showCreateRole &&
    !showCreatePenaltyEntry &&
    !showCreateTask &&
    !showCreateEvent &&
    !showCreateEventTemplate &&
    !showCreateSilcTransaction &&
    !showCreateWikiPage
  )
    return null;

  return (
    <div className={className}>
      <PopoverBaseUI
        title="Neu erstellen"
        trigger={
          <>
            <FaPlus />
            Neu
          </>
        }
        triggerRender={
          <Button2
            variant={Button2Variant.Secondary}
            colorSchema={Button2ColorSchema.InteractionMuted}
          />
        }
        triggerClassName={triggerClassName}
        childrenClassName="flex flex-col gap-px w-52"
        side={side}
        positionerClassName={positionerClassName}
        open={open}
        onOpenChange={onOpenChange}
      >
        <PopoverChildren
          showCreateCitizen={showCreateCitizen}
          showCreateDistributionCycle={showCreateDistributionCycle}
          showCreateOrganization={showCreateOrganization}
          showCreateRole={showCreateRole}
          showCreatePenaltyEntry={showCreatePenaltyEntry}
          showCreateTask={showCreateTask}
          showCreateEvent={showCreateEvent}
          showCreateEventTemplate={showCreateEventTemplate}
          showCreateSilcTransaction={showCreateSilcTransaction}
          showCreateWikiPage={showCreateWikiPage}
          showCreateFlow={showCreateFlow}
          showCreateManualNotification={showCreateManualNotification}
          onSelect={onSelect}
        />
      </PopoverBaseUI>
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
  readonly showCreateEvent: boolean;
  readonly showCreateEventTemplate: boolean;
  readonly showCreateSilcTransaction: boolean;
  readonly showCreateWikiPage: boolean;
  readonly showCreateFlow: boolean;
  readonly showCreateManualNotification: boolean;
  readonly onSelect?: () => void;
}

const PopoverChildren = ({
  showCreateCitizen,
  showCreateDistributionCycle,
  showCreateOrganization,
  showCreateRole,
  showCreatePenaltyEntry,
  showCreateTask,
  showCreateEvent,
  showCreateEventTemplate,
  showCreateSilcTransaction,
  showCreateWikiPage,
  showCreateFlow,
  showCreateManualNotification,
  onSelect,
}: PopoverChildrenProps) => {
  const { closePopover } = usePopoverBaseUI();
  const { openCreateModal } = useCreateContext();
  const { apps } = useAppsContext();

  const handleClick = (modalId: keyof typeof createForms) => {
    openCreateModal(modalId);
    closePopover();
    onSelect?.();
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
  if (showCreateEvent)
    items.push({ label: "Event", type: "button", modalId: "event" });
  if (showCreateEventTemplate)
    items.push({
      label: "Event-Vorlage",
      type: "button",
      modalId: "eventTemplate",
    });
  if (showCreateSilcTransaction)
    items.push({
      label: "SILC-Transaktion",
      type: "button",
      modalId: "silcTransaction",
    });
  if (showCreateWikiPage)
    items.push({
      label: "Wiki-Seite",
      type: "button",
      modalId: "wikiPage",
    });
  if (showCreateFlow)
    items.push({ label: "Karrierebaum", type: "button", modalId: "flow" });
  if (showCreateManualNotification)
    items.push({
      label: "Benachrichtigung",
      type: "button",
      modalId: "manualNotification",
    });

  items = items.toSorted((a, b) => a.label.localeCompare(b.label));

  const className =
    "block cursor-pointer hover:outline-interaction-700 focus-visible:outline-interaction-700 active:outline-interaction-500 outline-offset-4 outline outline-transparent transition-colors rounded-primary overflow-hidden bg-secondary group p-2 text-xs text-left";

  return (
    <div className="flex flex-col gap-0.5">
      {items.map((item) => {
        if (item.type === "link")
          return (
            <Link
              key={item.label}
              onClick={() => {
                closePopover();
                onSelect?.();
              }}
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
