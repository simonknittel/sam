import clsx from "clsx";
import type { ReactNode } from "react";
import { FaArrowUp } from "react-icons/fa";
import { CyclePhase } from "../utils/getCurrentPhase";

interface Props {
  readonly className?: string;
  readonly innerClassName?: string;
  readonly phase: CyclePhase;
  readonly currentPhase: CyclePhase;
  readonly children: ReactNode;
}

export const Phase = ({
  className,
  innerClassName,
  phase,
  currentPhase,
  children,
}: Props) => {
  const isCurrentPhase = phase === currentPhase;

  return (
    <>
      <section
        className={clsx(
          "flex rounded-primary overflow-hidden",
          {
            "opacity-50": !isCurrentPhase,
          },
          className,
        )}
      >
        <div
          className={clsx(
            "flex-none w-8 text-xs whitespace-nowrap flex items-center justify-center py-2 font-mono uppercase",
            {
              "bg-green-500 text-black": isCurrentPhase,
              "bg-neutral-700 text-white": !isCurrentPhase,
            },
          )}
          style={{
            writingMode: "sideways-lr",
          }}
        >
          {phase < currentPhase && "Abgeschlossene Phase"}
          {phase === currentPhase && "Aktuelle Phase"}
          {phase > currentPhase && "Nächste Phase"}
        </div>

        <div
          className={clsx("flex-1 p-4 background-secondary", innerClassName)}
        >
          {children}
        </div>
      </section>

      {phase > CyclePhase.Collection && (
        <div className="my-4 flex justify-center">
          <FaArrowUp className="text-4xl text-neutral-700" />
        </div>
      )}
    </>
  );
};
