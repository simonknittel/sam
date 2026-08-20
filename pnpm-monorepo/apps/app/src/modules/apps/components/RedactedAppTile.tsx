import clsx from "clsx";

/**
 * A random angle per render makes the server and the client disagree, which
 * mismatches on hydration for every redacted tile — so the angle is derived
 * from the app's name instead. Each tile still gets its own tilt, and it stays
 * the same across renders.
 */
const getRotationInDegrees = (name: string, maximumDegrees: number) => {
  let hash = 0;
  for (let index = 0; index < name.length; index++) {
    hash = (hash * 31 + name.charCodeAt(index)) | 0;
  }

  const rangeInDegrees = maximumDegrees * 2 + 1;
  return (Math.abs(hash) % rangeInDegrees) - maximumDegrees;
};

interface Props {
  readonly className?: string;
  /**
   * The app's name. Only ever used to derive the rotation — a redacted tile
   * never renders it.
   */
  readonly name: string;
  readonly variant?: "default" | "compact";
}

export const RedactedAppTile = ({
  className,
  name,
  variant = "default",
}: Props) => {
  if (variant === "compact") {
    return (
      <div
        className={clsx(
          "bg-secondary rounded-primary overflow-hidden relative p-2 text-xs",
          className,
        )}
      >
        Redacted
        <div className="absolute inset-0 flex items-center justify-center backdrop-blur-sm">
          <p
            className="text-brand-red-700 border border-brand-red-700 rounded-secondary px-2 py-1 text-xs relative"
            style={{
              transform: `rotate(${getRotationInDegrees(name, 8)}deg)`,
            }}
          >
            Redacted
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={clsx(
        "bg-secondary rounded-primary overflow-hidden",
        className,
      )}
    >
      <div className="aspect-video bg-black" />

      <div className="p-2 sm:p-4 relative flex flex-col gap-2">
        <h2 className="font-bold">Redacted</h2>

        <p className="text-xs text-neutral-400">
          Lorem ipsum dolor sit amet consectetur adipisicing elit.
        </p>

        <div className="absolute inset-0 flex items-center justify-center backdrop-blur-sm">
          <p
            className="text-brand-red-500 font-bold border-2 border-brand-red-500 rounded-secondary px-2 py-1 text-lg relative"
            style={{
              transform: `rotate(${getRotationInDegrees(name, 15)}deg)`,
            }}
          >
            Redacted
          </p>
        </div>
      </div>
    </div>
  );
};
