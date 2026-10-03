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
        "flex cursor-grab items-center justify-center rounded-secondary border-r border-white/10 px-2 hover:bg-white/5",
        className,
      )}
      title="Posten verschieben"
      onMouseDown={(e) => handleDragStart(e, position)}
    >
      <MdDragIndicator className="text-brand-red-500" />
    </button>
  );
};
