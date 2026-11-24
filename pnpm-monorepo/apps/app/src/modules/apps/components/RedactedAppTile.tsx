import clsx from "clsx";

/** Derived from the name: a random angle would mismatch on hydration */
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
  /** Only for the rotation: a redacted tile never renders it */
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
      <li
        className={clsx(
          "relative overflow-hidden rounded-primary bg-secondary p-2 text-xs",
          className,
        )}
      >
        Redacted
        <div className="absolute inset-0 flex items-center justify-center backdrop-blur-sm">
          <p
            className="relative rounded-secondary border border-brand-red-700 px-2 py-1 text-xs text-brand-red-700"
            style={{
              transform: `rotate(${getRotationInDegrees(name, 8)}deg)`,
            }}
          >
            Redacted
          </p>
        </div>
      </li>
    );
  }

  return (
    <li
      className={clsx(
        "overflow-hidden rounded-primary bg-secondary",
        className,
      )}
    >
      <div className="aspect-video bg-black" />

      <div className="relative flex flex-col gap-2 p-2 sm:p-4">
        <h2 className="font-bold">Redacted</h2>

        <p className="text-xs text-neutral-400">
          Lorem ipsum dolor sit amet consectetur adipisicing elit.
        </p>

        <div className="absolute inset-0 flex items-center justify-center backdrop-blur-sm">
          <p
            className="relative rounded-secondary border-2 border-brand-red-500 px-2 py-1 text-lg font-bold text-brand-red-500"
            style={{
              transform: `rotate(${getRotationInDegrees(name, 15)}deg)`,
            }}
          >
            Redacted
          </p>
        </div>
      </div>
    </li>
  );
};
