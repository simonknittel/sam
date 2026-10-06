"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { FaEllipsisH, FaTimes } from "react-icons/fa";
import Button from "./Button";
import { PopoverBaseUI, usePopoverBaseUI } from "./PopoverBaseUI";

interface Props {
  children?: ReactNode;
}

export const Actions = ({ children }: Readonly<Props>) => {
  return (
    <PopoverBaseUI
      title="Aktionen"
      /**
       * Base UI sets `data-popup-open` on the trigger while the menu is open.
       * The icon follows this attribute, not an own state: `onOpenChange`
       * does not report a close by an entry (`closePopover`).
       */
      trigger={
        <>
          <FaEllipsisH className="group-data-popup-open:hidden" />
          <FaTimes className="hidden group-data-popup-open:block" />
        </>
      }
      triggerClassName="group"
      triggerRender={<Button variant="secondary" iconOnly={true} />}
      triggerTitle="Aktionen"
      openOnHover={false}
      side="left"
      childrenClassName="flex flex-col items-start gap-2"
    >
      <ActionsContextBridge>{children}</ActionsContextBridge>
    </PopoverBaseUI>
  );
};

const ActionsContextBridge = ({ children }: Readonly<Props>) => {
  const { closePopover } = usePopoverBaseUI();

  const value = useMemo(() => ({ closePopover }), [closePopover]);

  return <ActionContext value={value}>{children}</ActionContext>;
};

interface ActionContextInterface {
  closePopover: () => void;
}

const ActionContext = createContext<ActionContextInterface | undefined>(
  undefined,
);

/**
 * Check for undefined since the defaultValue of the context is undefined. If
 * it's still undefined, then the provider is missing.
 *
 * Deliberately not named `useAction` — that name belongs to the server-action
 * hook in `modules/actions`.
 */
export function useActionsContext() {
  const context = useContext(ActionContext);
  if (!context)
    throw new Error(
      "Provider for `useActionsContext()` is missing. Make sure to have a `<Actions> ... </Actions>` parent.",
    );
  return context;
}

/** The row menu around the component, or undefined outside of a row menu */
export const useOptionalActionsContext = () => useContext(ActionContext);
