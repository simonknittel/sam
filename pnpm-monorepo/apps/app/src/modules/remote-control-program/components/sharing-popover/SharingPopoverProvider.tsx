"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { SharingPopoverTab } from "./SharingPopoverTab";

interface SharingPopoverContext {
  /**
   * A control UI opened the popover with this tab. The request stays pending
   * until the surface of the current viewport opens, see
   * `useSharingPopoverOpenState()`.
   */
  readonly requestedTab: SharingPopoverTab | null;
  readonly requestOpen: (tab: SharingPopoverTab) => void;
  readonly settleOpenRequest: () => void;
}

/** Null when the user cannot use the Remote Control Program */
const SharingPopoverContext = createContext<SharingPopoverContext | null>(null);

interface Props {
  /** See `BrowserRuntimeProvider` */
  readonly isEnabled: boolean;
  readonly children: ReactNode;
}

/**
 * The open state of the sharing popover, which the control UIs share with
 * the items of the shell. `BrowserRuntimeProvider` renders it.
 */
export const SharingPopoverProvider = ({ isEnabled, children }: Props) => {
  const [requestedTab, setRequestedTab] = useState<SharingPopoverTab | null>(
    null,
  );

  const value: SharingPopoverContext = {
    requestedTab,
    requestOpen: setRequestedTab,
    settleOpenRequest: () => setRequestedTab(null),
  };

  return (
    <SharingPopoverContext value={isEnabled ? value : null}>
      {children}
    </SharingPopoverContext>
  );
};

/** The functions of the control UIs (see `useSharingPopoverOpener()`) */
export interface SharingPopoverOpener {
  /**
   * Opens the sharing popover with the tab: the popover of the top bar on a
   * large viewport, else the bottom sheet. Example: the Log Analyzer asks the
   * owner to select the log folder.
   */
  readonly open: (tab: SharingPopoverTab) => void;
}

/**
 * For the control UIs, for example the Log Analyzer: a control UI never has
 * its own UI for the access, it opens the sharing popover (see "Sharing
 * popover" of `docs/remote-control-program/README.md`). Null when the user
 * cannot use the Remote Control Program.
 */
export const useSharingPopoverOpener = (): SharingPopoverOpener | null => {
  const context = useContext(SharingPopoverContext);
  if (!context) return null;

  return { open: context.requestOpen };
};

const useSharingPopoverContext = () => {
  const context = useContext(SharingPopoverContext);
  if (!context)
    throw new Error(
      "The sharing popover needs the BrowserRuntimeProvider of a user who can use the Remote Control Program",
    );

  return context;
};

/**
 * The open state of one surface of the sharing popover. While a request of a
 * control UI is pending and the surface can act, the popover opens and the
 * request settles. A popover which is open already stays open.
 *
 * Only one surface at a time can act, otherwise two popovers open.
 */
export const useSharingPopoverOpenState = (canActOnRequest: boolean) => {
  const { requestedTab, settleOpenRequest } = useSharingPopoverContext();
  const [isOpen, setIsOpen] = useState(false);
  /**
   * The tab of the control UI that opened the popover. Null: its trigger
   * opened it. After a control UI, the focus must move into the popover, else
   * a keyboard user cannot reach it.
   */
  const [tabOfControlUi, setTabOfControlUi] =
    useState<SharingPopoverTab | null>(null);

  const isActingOnRequest = requestedTab !== null && canActOnRequest;
  if (isActingOnRequest && !isOpen) {
    setIsOpen(true);
    setTabOfControlUi(requestedTab);
  }

  useEffect(() => {
    // eslint-disable-next-line react-you-might-not-need-an-effect/no-event-handler -- The request comes from a different component, and a render must not change the state of the provider.
    if (isActingOnRequest) settleOpenRequest();
  }, [isActingOnRequest, settleOpenRequest]);

  /** An open or a close by the user: the trigger, Escape, a click outside */
  const changeOpenByUser = (nextIsOpen: boolean) => {
    setIsOpen(nextIsOpen);
    setTabOfControlUi(null);
  };

  return { isOpen, tabOfControlUi, setIsOpen, changeOpenByUser };
};
