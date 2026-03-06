import { Handle, Position } from "@xyflow/react";
import clsx from "clsx";

interface Props {
  isUpdating?: boolean;
}

export const Handles = ({ isUpdating }: Props) => {
  return (
    <>
      <Handle
        id="left"
        type="source"
        position={Position.Left}
        className={clsx("opacity-0 group-hover/node:opacity-100", {
          "opacity-0!": !isUpdating,
        })}
      />

      <Handle
        id="right"
        type="source"
        position={Position.Right}
        className={clsx("opacity-0 group-hover/node:opacity-100", {
          "opacity-0!": !isUpdating,
        })}
      />

      <Handle
        id="top"
        type="target"
        position={Position.Top}
        className={clsx("opacity-0 group-hover/node:opacity-100", {
          "opacity-0!": !isUpdating,
        })}
      />

      <Handle
        id="bottom"
        type="source"
        position={Position.Bottom}
        className={clsx("opacity-0 group-hover/node:opacity-100", {
          "opacity-0!": !isUpdating,
        })}
      />
    </>
  );
};
