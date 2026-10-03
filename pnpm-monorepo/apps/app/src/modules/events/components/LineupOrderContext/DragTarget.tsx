import clsx from "clsx";
import type { PositionType } from "../Position";
import { useLineupOrder } from "./Context";

interface Props {
  readonly className?: string;
  readonly position: PositionType;
  readonly order: "before" | "after";
  readonly parentPositions: PositionType["id"][];
  readonly groupLevel: number;
}

export const DragTarget = ({
  className,
  position,
  order,
  parentPositions,
  groupLevel,
}: Props) => {
  const { isDragging, handleDragEnd } = useLineupOrder();

  if (!isDragging) return null;
  if (isDragging.id === position.id) return null;
  if (parentPositions.includes(isDragging.id)) return null;

  return (
    <div className={clsx("relative", className)}>
      <div
        data-drop-target={order}
        className={clsx(
          "absolute right-0 left-0 h-8 hover:border-green-500 hover:from-green-900",
          {
            "top-0 bg-linear-to-b hover:border-t-2": order === "before",
            "bottom-0 bg-linear-to-t hover:border-b-2": order === "after",
            "right-0":
              order === "before" || (order === "after" && groupLevel >= 4),
            "right-1/2": order === "after" && groupLevel < 4,
          },
        )}
        onMouseUp={(e) => handleDragEnd(e, position, order)}
      />

      {order === "after" && groupLevel < 4 && (
        <div
          data-drop-target="inside"
          className="absolute right-0 bottom-0 left-[calc(50%+1px)] h-8 bg-linear-to-t hover:border-b-2 hover:border-green-500 hover:from-green-900"
          onMouseUp={(e) => handleDragEnd(e, position, "inside")}
        />
      )}
    </div>
  );
};
