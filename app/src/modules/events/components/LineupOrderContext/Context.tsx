"use client";

import type {
  Entity,
  Manufacturer,
  Series,
  Ship,
  Variant,
} from "@/generated/prisma/browser";
import {
  updateEventLineupOrder,
  type MappedPosition,
} from "@/modules/events/actions/updateEventLineupOrder";
import clsx from "clsx";
import { unstable_rethrow } from "next/navigation";
import type { MouseEvent } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useTransition,
} from "react";
import toast from "react-hot-toast";
import { Position, type PositionType } from "../Position";

interface LineupOrderContext {
  positions: PositionType[];
  handleDragStart: (
    e: MouseEvent<HTMLButtonElement>,
    position: PositionType,
  ) => void;
  handleDragEnd: (
    e: MouseEvent<HTMLDivElement>,
    targetPosition: PositionType,
    order: "before" | "after" | "inside",
  ) => void;
  isDragging: PositionType | null;
}

const LineupOrderContext = createContext<LineupOrderContext | undefined>(
  undefined,
);

interface Props {
  readonly className?: string;
  readonly positions: PositionType[];
  readonly showManage?: boolean;
  readonly variants: (Manufacturer & {
    series: (Series & {
      variants: Variant[];
    })[];
  })[];
  readonly myShips: Ship[];
  readonly allEventCitizens: { citizen: Entity; ships: Ship[] }[];
  readonly showActions?: boolean;
}

export const LineupOrderProvider = ({
  className,
  positions,
  showManage,
  variants,
  myShips,
  allEventCitizens,
  showActions,
}: Props) => {
  const [isDragging, setIsDragging] = useState<PositionType | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleCancel = useCallback(() => {
    setIsDragging(null);
  }, []);

  const handleDragStart = useCallback(
    (e: MouseEvent<HTMLButtonElement>, position: PositionType) => {
      setIsDragging(position);
      document.addEventListener("mouseup", handleCancel, {
        once: true,
      });
    },
    [handleCancel],
  );

  const handleDragEnd = useCallback(
    (
      e: MouseEvent<HTMLDivElement>,
      targetPosition: PositionType,
      order: "before" | "after" | "inside",
    ) => {
      startTransition(async () => {
        document.removeEventListener("mouseup", handleCancel);
        setIsDragging(null);

        if (!isDragging) return;
        if (targetPosition.id === isDragging.id) return;

        const clonedDraggedPosition = structuredClone(isDragging);
        const clonedPositions = structuredClone(positions);

        // Remove dragged position from old order
        const removeLoop = (positions: PositionType[]) => {
          for (const [index, position] of positions.entries()) {
            if (position.id === clonedDraggedPosition.id) {
              positions.splice(index, 1);
              return true;
            }

            if (position.childPositions) {
              if (removeLoop(position.childPositions)) return true;
            }
          }
        };
        removeLoop(clonedPositions);

        // Insert dragged position into new order
        if (order === "before") {
          const beforeLoop = (positions: PositionType[]) => {
            for (const [index, position] of positions.entries()) {
              if (position.id === targetPosition.id) {
                positions.splice(index, 0, clonedDraggedPosition);
                positions.forEach(
                  (position, index) => (position.order = index),
                );
                return true;
              }

              if (position.childPositions) {
                if (beforeLoop(position.childPositions)) return true;
              }
            }
          };
          beforeLoop(clonedPositions);
        } else if (order === "after") {
          const afterLoop = (positions: PositionType[]) => {
            for (const [index, position] of positions.entries()) {
              if (position.id === targetPosition.id) {
                positions.splice(index + 1, 0, clonedDraggedPosition);
                positions.forEach(
                  (position, index) => (position.order = index),
                );
                return true;
              }

              if (position.childPositions) {
                if (afterLoop(position.childPositions)) return true;
              }
            }
          };
          afterLoop(clonedPositions);
        } else if (order === "inside") {
          const insertLoop = (positions: PositionType[]) => {
            for (const [, position] of positions.entries()) {
              if (position.id === targetPosition.id) {
                if (!position.childPositions) position.childPositions = [];
                position.childPositions.splice(0, 0, clonedDraggedPosition);
                position.childPositions.forEach(
                  (position, index) => (position.order = index),
                );
                return true;
              }

              if (position.childPositions) {
                if (insertLoop(position.childPositions)) return true;
              }
            }
          };
          insertLoop(clonedPositions);
        }

        /**
         * Save to database
         */
        const formData = new FormData();
        formData.append("eventId", positions[0].eventId);
        const mapPosition = (position: MappedPosition): MappedPosition => ({
          id: position.id,
          order: position.order,
          childPositions: position.childPositions?.map(mapPosition),
        });
        formData.append(
          "order",
          JSON.stringify(clonedPositions.map(mapPosition)),
        );

        try {
          const response = await updateEventLineupOrder(formData);

          if (response.error) {
            toast.error(response.error);
            console.error(response);
            return;
          }

          toast.success(response.success!);
        } catch (error) {
          unstable_rethrow(error);
          toast.error(
            "Ein unbekannter Fehler ist aufgetreten. Bitte versuche es später erneut.",
          );
          console.error(error);
        }
      });
    },
    [handleCancel, isDragging, positions],
  );

  const value = useMemo(
    () => ({
      positions,
      handleDragStart,
      handleDragEnd,
      isDragging,
    }),
    [positions, handleDragStart, handleDragEnd, isDragging],
  );

  return (
    <LineupOrderContext.Provider value={value}>
      <div
        className={clsx(
          {
            "animate-pulse cursor-wait pointer-events-none": isPending,
          },
          className,
        )}
      >
        {positions.map((position) => (
          <Position
            key={position.id}
            position={position}
            showManage={showManage}
            variants={variants}
            myShips={myShips}
            allEventCitizens={allEventCitizens}
            showActions={showActions}
            groupLevel={1}
            parentPositions={[]}
          />
        ))}
      </div>

      {/* {isDragging && <DragPlaceholder />} */}
    </LineupOrderContext.Provider>
  );
};

/**
 * Check for undefined since the defaultValue of the context is undefined. If
 * it's still undefined, the provider component is missing.
 */
export function useLineupOrder() {
  const context = useContext(LineupOrderContext);
  if (!context) throw new Error("Provider missing!");
  return context;
}
