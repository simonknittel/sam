"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { SharingPopoverLocation } from "./SharingPopoverTab";

interface SharingPopoverContext {
  /**
   * A control UI opened the popover with this location. The request stays
   * pending until the surface of the current viewport opens, see
   * `useSharingPopoverOpenState()`.
   */
  readonly requestedLocation: SharingPopoverLocation | null;
  readonly requestOpen: (location: SharingPopoverLocation) => void;
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
  const [requestedLocation, setRequestedLocation] =
    useState<SharingPopoverLocation | null>(null);

  const value: SharingPopoverContext = {
    requestedLocation,
    requestOpen: setRequestedLocation,
    settleOpenRequest: () => setRequestedLocation(null),
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
   * Opens the sharing popover with the tab and the sub-tab of the location:
   * the popover of the top bar on a large viewport, else the bottom sheet.
   * Example: the Log Analyzer asks the owner to select the log folder in the
   * sub-tab of the browser.
   */
  readonly open: (location: SharingPopoverLocation) => void;
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
  const { requestedLocation, settleOpenRequest } = useSharingPopoverContext();
  const [isOpen, setIsOpen] = useState(false);
  /**
   * The location of the control UI that opened the popover. Null: its
   * trigger opened it. After a control UI, the focus must move into the
   * popover, else a keyboard user cannot reach it.
   */
  const [locationOfControlUi, setLocationOfControlUi] =
    useState<SharingPopoverLocation | null>(null);

  const isActingOnRequest = requestedLocation !== null && canActOnRequest;
  if (isActingOnRequest && !isOpen) {
    setIsOpen(true);
    setLocationOfControlUi(requestedLocation);
  }

  useEffect(() => {
    // eslint-disable-next-line react-you-might-not-need-an-effect/no-event-handler -- The request comes from a different component, and a render must not change the state of the provider.
    if (isActingOnRequest) settleOpenRequest();
  }, [isActingOnRequest, settleOpenRequest]);

  /** An open or a close by the user: the trigger, Escape, a click outside */
  const changeOpenByUser = (nextIsOpen: boolean) => {
    setIsOpen(nextIsOpen);
    setLocationOfControlUi(null);
  };

  return { isOpen, locationOfControlUi, setIsOpen, changeOpenByUser };
};
