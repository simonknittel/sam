import { formatDate } from "@/modules/common/utils/formatDate";

interface Props {
  readonly plannedEnd: Date | null;
  readonly actualEnd: Date | null;
}

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
