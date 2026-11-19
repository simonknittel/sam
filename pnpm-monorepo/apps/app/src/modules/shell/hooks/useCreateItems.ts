"use client";

import { useAppsContext } from "@/modules/apps/components/AppsContext";
import type { ExternalApp } from "@/modules/apps/utils/types";
import { useAuthentication } from "@/modules/auth/hooks/useAuthentication";
import type { createForms } from "@/modules/common/components/CreateContext";

export enum CreateItemType {
  Modal = "modal",
  Link = "link",
}

interface ModalCreateItem {
  readonly type: CreateItemType.Modal;
  readonly label: string;
  readonly modalId: keyof typeof createForms;
}

interface LinkCreateItem {
  readonly type: CreateItemType.Link;
  readonly label: string;
  readonly href: string;
}

export type CreateItem = ModalCreateItem | LinkCreateItem;

interface ModalCreateItemCandidate extends Omit<ModalCreateItem, "type"> {
  readonly isAllowed: boolean;
}

/**
 * The items of the "Neu" menu that the user is allowed to use. The top bar
 * and the CmdK menu show these items.
 */
export const useCreateItems = (): CreateItem[] => {
  const authentication = useAuthentication();
  const { apps } = useAppsContext();

  if (!authentication) return [];

  const authorize = (...args: Parameters<typeof authentication.authorize>) =>
    Boolean(authentication.authorize(...args));

  const canCreateEvent = authorize("event", "create");

  const modalItems: ModalCreateItemCandidate[] = [
    {
      label: "Citizen",
      modalId: "citizen",
      isAllowed: authorize("citizen", "create"),
    },
    {
      label: "SINcome-Zeitraum",
      modalId: "profitDistributionCycle",
      isAllowed: authorize("profitDistributionCycle", "create"),
    },
    {
      label: "Organisation",
      modalId: "organization",
      isAllowed: authorize("organization", "create"),
    },
    {
      label: "Rolle",
      modalId: "role",
      isAllowed: authorize("role", "manage"),
    },
    {
      label: "Strafpunkte",
      modalId: "penaltyEntry",
      isAllowed: authorize("penaltyEntry", "create"),
    },
    {
      label: "Task",
      modalId: "task",
      isAllowed: authorize("task", "create"),
    },
    { label: "Event", modalId: "event", isAllowed: canCreateEvent },
    /** Same gate as creating an event: a template is a blueprint of one */
    {
      label: "Event-Vorlage",
      modalId: "eventTemplate",
      isAllowed: canCreateEvent,
    },
    {
      label: "SILC-Transaktion",
      modalId: "silcTransaction",
      isAllowed: authorize("silcTransactionOfOtherCitizen", "create"),
    },
    { label: "Wiki-Seite", modalId: "wikiPage", isAllowed: true },
    {
      label: "Karrierebaum",
      modalId: "flow",
      isAllowed: authorize("career", "manage"),
    },
    {
      label: "Benachrichtigung",
      modalId: "manualNotification",
      isAllowed: authorize("manualNotification", "manage"),
    },
    {
      label: "Schiff",
      modalId: "ship",
      isAllowed: authorize("ship", "manage"),
    },
  ];

  const linkItems = (apps ?? [])
    .filter((app): app is ExternalApp => "createLinks" in app)
    .flatMap((app) =>
      (app.createLinks ?? []).map((link): LinkCreateItem => ({
        type: CreateItemType.Link,
        label: link.title,
        href: `/app/external/${app.slug}/${link.slug}`,
      })),
    );

  return [
    ...linkItems,
    ...modalItems
      .filter((item) => item.isAllowed)
      .map(({ label, modalId }): ModalCreateItem => ({
        type: CreateItemType.Modal,
        label,
        modalId,
      })),
  ].toSorted((a, b) => a.label.localeCompare(b.label));
};
