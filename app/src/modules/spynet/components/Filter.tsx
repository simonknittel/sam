"use client";

import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import * as Popover from "@radix-ui/react-popover";
import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { FaChevronDown } from "react-icons/fa";

interface Props {
  readonly name: string;
  readonly children?: ReactNode;
}

export const Filter = ({ name, children }: Props) => {
  const [isOpen, setIsOpen] = useState(false);

  const value = useMemo(
    () => ({
      setIsOpen,
    }),
    [setIsOpen],
  );

  return (
    <FilterContext.Provider value={value}>
      <Popover.Root open={isOpen} onOpenChange={setIsOpen}>
        <Popover.Trigger asChild>
          <Button2 variant={Button2Variant.Secondary}>
            <FaChevronDown /> {name}
          </Button2>
        </Popover.Trigger>

        <Popover.Portal>
          <Popover.Content sideOffset={4}>
            {children}

            <Popover.Arrow className="fill-neutral-800" />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </FilterContext.Provider>
  );
};

interface FilterContextInterface {
  setIsOpen: (value: boolean) => void;
}

const FilterContext = createContext<FilterContextInterface | undefined>(
  undefined,
);

/**
 * Check for undefined since the defaultValue of the context is undefined. If
 * it's still undefined, the provider component is missing.
 */
export function useFilter() {
  const context = useContext(FilterContext);
  if (!context)
    throw new Error(
      "Provider for `useFilter()` is missing. Make sure to have a `<Filter> ... </Filter>` parent.",
    );
  return context;
}
