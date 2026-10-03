import { formatDate } from "@/modules/common/utils/formatDate";

interface Props {
  readonly plannedEnd: Date | null;
  readonly actualEnd: Date | null;
}

/** Shows the actual end of a phase after it ended, else its planned end */
export const PhaseEndDate = ({ plannedEnd, actualEnd }: Props) => {
  return (
    <div className="flex flex-col items-center justify-center text-sm">
      <h3 className="text-neutral-500">
        {actualEnd ? "Endete am" : "Endet am"}
      </h3>

      <p>{formatDate(actualEnd ?? plannedEnd, "short") ?? "-"}</p>
    </div>
  );
};
