"use client";

import { useStoredValue } from "@/modules/common/utils/useStoredValue";
import clsx from "clsx";
import type { ReactNode } from "react";
import { createContext, startTransition, useContext } from "react";
import type { PositionType } from "./Position";

interface LineupVisibilityContext {
  openItems: PositionType["id"][];
  open: (itemId: PositionType["id"]) => void;
  close: (itemId: PositionType["id"]) => void;
  closeAll: () => void;
  openAll: () => void;
}

const LineupVisibilityContext = createContext<
  LineupVisibilityContext | undefined
>(undefined);

type VisibilityItem = Pick<PositionType, "id"> & {
  readonly childPositions?: readonly VisibilityItem[];
};

interface Props {
  readonly children: ReactNode;
  readonly items: readonly VisibilityItem[];
}

export const LineupVisibilityProvider = ({ children, items }: Props) => {
  const [openItems, setOpenItems] = useStoredValue<PositionType["id"][]>(
    "open_positions",
    [],
  );

  const open = (itemId: PositionType["id"]) => {
    setOpenItems((prev) => [...prev, itemId]);
  };

  const openAll = () => {
    const allItemIds: PositionType["id"][] = [];

    const loop = (items: readonly VisibilityItem[]) => {
      for (const item of items) {
        allItemIds.push(item.id);

        if (item.childPositions) {
          loop(item.childPositions);
        }
      }
    };
    loop(items);

    startTransition(() => {
      setOpenItems(allItemIds);
    });
  };

  const close = (itemId: PositionType["id"]) => {
    setOpenItems((prev) => prev.filter((id) => id !== itemId));
  };

  const closeAll = () => {
    startTransition(() => {
      setOpenItems([]);
    });
  };

  const value = {
    openItems,
    open,
    openAll,
    close,
    closeAll,
  };

  return (
    <LineupVisibilityContext value={value}>{children}</LineupVisibilityContext>
  );
};

/**
 * Check for undefined since the defaultValue of the context is undefined. If
 * it's still undefined, the provider component is missing.
 */
export function useLineupVisibility() {
  const context = useContext(LineupVisibilityContext);
  if (!context) throw new Error("Provider missing!");
  return context;
}

type ToggleAllProps = Readonly<{
  className?: string;
}>;

export const ToggleAll = ({ className }: ToggleAllProps) => {
  const { openAll, closeAll } = useLineupVisibility();

  return (
    <div className={clsx("flex gap-2", className)}>
      <button
        onClick={openAll}
        className="text-brand-red-500 hover:text-brand-red-300 hover:underline focus-visible:text-brand-red-300 focus-visible:underline"
      >
        Alle öffnen
      </button>
      /
      <button
        onClick={closeAll}
        className="text-brand-red-500 hover:text-brand-red-300 hover:underline focus-visible:text-brand-red-300 focus-visible:underline"
      >
        schließen
      </button>
    </div>
  );
};
