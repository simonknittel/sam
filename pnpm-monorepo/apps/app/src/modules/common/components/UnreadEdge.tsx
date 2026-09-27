import clsx from "clsx";

export enum UnreadEdgeWidth {
  Thin = "thin",
  Regular = "regular",
}

interface Props {
  readonly width?: UnreadEdgeWidth;
  readonly title?: string;
}

/**
 * Amber edge along the left side of an unread or new item, fading downwards.
 * The item must be positioned. Used together with `NewBadge`.
 */
export const UnreadEdge = ({
  width = UnreadEdgeWidth.Regular,
  title,
}: Props) => {
  return (
    <div
      className={clsx("absolute left-0 top-0 bottom-0", {
        "w-px": width === UnreadEdgeWidth.Thin,
        "w-0.5": width === UnreadEdgeWidth.Regular,
      })}
      style={{
        background: "linear-gradient(to bottom, #f59e0b, transparent)",
      }}
      title={title}
    />
  );
};
