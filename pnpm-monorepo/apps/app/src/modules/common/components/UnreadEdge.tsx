import clsx from "clsx";

export enum UnreadEdgeWidth {
  Thin = "thin",
  Regular = "regular",
}

interface Props {
  readonly width?: UnreadEdgeWidth;
  readonly title?: string;
}

/** The item must be positioned */
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
