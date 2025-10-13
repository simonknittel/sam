import clsx from "clsx";
import { MdDragIndicator } from "react-icons/md";
import type { PositionType } from "../Position";
import { useLineupOrder } from "./Context";

interface Props {
  readonly className?: string;
  readonly position: PositionType;
}

export const DragHandle = ({ className, position }: Props) => {
  const { handleDragStart } = useLineupOrder();

  return (
    <button
      type="button"
      className={clsx(
        "flex items-center justify-center border-r border-white/10 hover:bg-neutral-800 rounded-secondary px-2 cursor-grab",
        className,
      )}
      title="Posten verschieben"
      onMouseDown={(e) => handleDragStart(e, position)}
    >
      <MdDragIndicator className="text-brand-red-500" />
    </button>
  );
};
