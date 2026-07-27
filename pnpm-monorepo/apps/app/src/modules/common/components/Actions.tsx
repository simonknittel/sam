"use client";

import * as Popover from "@radix-ui/react-popover";
import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { FaEllipsisH, FaTimes } from "react-icons/fa";
import Button from "./Button";

interface Props {
  children?: ReactNode;
}

export const Actions = ({ children }: Readonly<Props>) => {
  const [isOpen, setIsOpen] = useState(false);

  const value = useMemo(
    () => ({
      setIsOpen,
    }),
    [setIsOpen],
  );

  return (
    <ActionContext.Provider value={value}>
      <Popover.Root open={isOpen} onOpenChange={setIsOpen}>
        <Popover.Trigger asChild>
          <Button variant="secondary" iconOnly={true}>
            {isOpen ? <FaTimes /> : <FaEllipsisH />}
          </Button>
        </Popover.Trigger>

        <Popover.Portal>
          <Popover.Content
            sideOffset={4}
            side="left"
            className="flex flex-col items-start gap-2 px-4 py-2 rounded-secondary bg-neutral-800 border border-neutral-900 z-10"
          >
            {children}

            <Popover.Arrow className="fill-neutral-800" />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </ActionContext.Provider>
  );
};

interface ActionContextInterface {
  setIsOpen: (value: boolean) => void;
}

const ActionContext = createContext<ActionContextInterface | undefined>(
  undefined,
);

/**
 * Check for undefined since the defaultValue of the context is undefined. If
 * it's still undefined, then the provider is missing.
 */
export function useAction() {
  const context = useContext(ActionContext);
  if (!context)
    throw new Error(
      "Provider for `useAction()` is missing. Make sure to have a `<Action> ... </Action>` parent.",
    );
  return context;
}
