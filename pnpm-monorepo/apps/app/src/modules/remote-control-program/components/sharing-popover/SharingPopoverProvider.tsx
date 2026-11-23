"use client";

import type { OlderEntriesTimeRange } from "@sam-monorepo/remote-control-program-runtime";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

/**
 * A request for older entries from a control UI. The section "Dieser
 * Browser" counts its entries and uploads them only after the confirmation
 * of the owner.
 */
export interface OlderEntriesRequestDraft {
  /** Each request has a new key, also for the same range */
  readonly key: string;
  readonly range: OlderEntriesTimeRange;
}

interface SharingPopoverContext {
  /**
   * A control UI opened the popover. The request stays pending until the
   * surface of the current viewport opens, see `useSharingPopoverOpenState()`.
   */
  readonly isOpenRequested: boolean;
  readonly requestOpen: () => void;
  readonly settleOpenRequest: () => void;
  readonly olderEntriesRequest: OlderEntriesRequestDraft | null;
  readonly openWithOlderEntriesRequest: (range: OlderEntriesTimeRange) => void;
  readonly endOlderEntriesRequest: () => void;
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
  const [isOpenRequested, setIsOpenRequested] = useState(false);
  const [olderEntriesRequest, setOlderEntriesRequest] =
    useState<OlderEntriesRequestDraft | null>(null);

  const value: SharingPopoverContext = {
    isOpenRequested,
    requestOpen: () => {
      setOlderEntriesRequest(null);
      setIsOpenRequested(true);
    },
    settleOpenRequest: () => setIsOpenRequested(false),
    olderEntriesRequest,
    openWithOlderEntriesRequest: (range) => {
      setOlderEntriesRequest({ key: crypto.randomUUID(), range });
      setIsOpenRequested(true);
    },
    endOlderEntriesRequest: () => setOlderEntriesRequest(null),
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
   * Opens the sharing popover: the popover of the top bar on a large
   * viewport, else the bottom sheet of the mobile action bar. Example: the
   * Log Analyzer asks the owner to select the log folder.
   */
  readonly open: () => void;
  /**
   * Opens the sharing popover with a request for the older entries of the
   * range (`end` is exclusive, null is no limit). The section "Dieser
   * Browser" counts the entries of the types that are on and that the relay
   * does not have, and uploads them only after the confirmation of the
   * owner. A new request replaces an open request. Each open or close of the
   * popover by the user ends the request.
   */
  readonly openWithOlderEntriesRequest: (range: OlderEntriesTimeRange) => void;
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

  return {
    open: context.requestOpen,
    openWithOlderEntriesRequest: context.openWithOlderEntriesRequest,
  };
};

const useSharingPopoverContext = () => {
  const context = useContext(SharingPopoverContext);
  if (!context)
    throw new Error(
      "The sharing popover needs the BrowserRuntimeProvider of a user who can use the Remote Control Program",
    );

  return context;
};

/** The request for older entries that the popover shows, or null */
export const useOlderEntriesRequest = () => {
  const { olderEntriesRequest, endOlderEntriesRequest } =
    useSharingPopoverContext();

  return { request: olderEntriesRequest, end: endOlderEntriesRequest };
};

/**
 * The open state of one surface of the sharing popover. While a request of a
 * control UI is pending and the surface can act, the popover opens and the
 * request settles. A popover which is open already stays open.
 *
 * Only one surface at a time can act, otherwise two popovers open.
 */
export const useSharingPopoverOpenState = (canActOnRequest: boolean) => {
  const { isOpenRequested, settleOpenRequest, endOlderEntriesRequest } =
    useSharingPopoverContext();
  const [isOpen, setIsOpen] = useState(false);

  const isActingOnRequest = isOpenRequested && canActOnRequest;
  if (isActingOnRequest && !isOpen) setIsOpen(true);

  useEffect(() => {
    // eslint-disable-next-line react-you-might-not-need-an-effect/no-event-handler -- The request comes from a different component, and a render must not change the state of the provider.
    if (isActingOnRequest) settleOpenRequest();
  }, [isActingOnRequest, settleOpenRequest]);

  /**
   * An open or a close by the user (the trigger, Escape, a click outside)
   * ends the request for older entries: it belongs to the open by the
   * control UI
   */
  const changeOpenByUser = (nextIsOpen: boolean) => {
    setIsOpen(nextIsOpen);
    endOlderEntriesRequest();
  };

  return { isOpen, setIsOpen, changeOpenByUser };
};
