"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { FaEllipsisH, FaTimes } from "react-icons/fa";
import Button from "./Button";
import { PopoverBaseUI, usePopoverBaseUI } from "./PopoverBaseUI";

interface Props {
  children?: ReactNode;
}

export const Actions = ({ children }: Readonly<Props>) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <PopoverBaseUI
      title="Aktionen"
      trigger={isOpen ? <FaTimes /> : <FaEllipsisH />}
      triggerRender={<Button variant="secondary" iconOnly={true} />}
      triggerTitle="Aktionen"
      onOpenChange={setIsOpen}
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

  return (
    <ActionContext.Provider value={value}>{children}</ActionContext.Provider>
  );
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
