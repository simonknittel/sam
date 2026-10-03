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
      className={clsx(
        "absolute top-0 bottom-0 left-0 bg-linear-to-b from-amber-500",
        {
          "w-px": width === UnreadEdgeWidth.Thin,
          "w-0.5": width === UnreadEdgeWidth.Regular,
        },
      )}
      title={title}
    />
  );
};
