"use client";

import type { EventPosition } from "@prisma/client";
import { useLocalStorage } from "@uidotdev/usehooks";
import clsx from "clsx";
import type { ReactNode } from "react";
import {
  createContext,
  startTransition,
  useCallback,
  useContext,
  useMemo,
} from "react";

interface LineupVisibilityContext {
  openItems: EventPosition["id"][];
  open: (itemId: EventPosition["id"]) => void;
  close: (itemId: EventPosition["id"]) => void;
  closeAll: () => void;
  openAll: () => void;
}

const LineupVisibilityContext = createContext<
  LineupVisibilityContext | undefined
>(undefined);

type PositionType = EventPosition & {
  childPositions?: PositionType[];
};

interface Props {
  readonly children: ReactNode;
  readonly items: PositionType[];
}

export const LineupVisibilityProvider = ({ children, items }: Props) => {
  const [openItems, setOpenItems] = useLocalStorage<EventPosition["id"][]>(
    "open_positions",
    [],
  );

  const open = useCallback(
    (itemId: EventPosition["id"]) => {
      setOpenItems((prev) => [...prev, itemId]);
    },
    [setOpenItems],
  );

  const openAll = useCallback(() => {
    const allItemIds: EventPosition["id"][] = [];

    const loop = (items: PositionType[]) => {
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
  }, [setOpenItems, items]);

  const close = useCallback(
    (itemId: EventPosition["id"]) => {
      setOpenItems((prev) => prev.filter((id) => id !== itemId));
    },
    [setOpenItems],
  );

  const closeAll = useCallback(() => {
    startTransition(() => {
      setOpenItems([]);
    });
  }, [setOpenItems]);

  const value = useMemo(
    () => ({
      openItems,
      open,
      openAll,
      close,
      closeAll,
    }),
    [openItems, open, openAll, close, closeAll],
  );

  return (
    <LineupVisibilityContext.Provider value={value}>
      {children}
    </LineupVisibilityContext.Provider>
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
        className="text-brand-red-500 hover:text-brand-red-300 focus-visible:text-brand-red-300 hover:underline focus-visible:underline"
      >
        Alle öffnen
      </button>
      /
      <button
        onClick={closeAll}
        className="text-brand-red-500 hover:text-brand-red-300 focus-visible:text-brand-red-300 hover:underline focus-visible:underline"
      >
        schließen
      </button>
    </div>
  );
};
