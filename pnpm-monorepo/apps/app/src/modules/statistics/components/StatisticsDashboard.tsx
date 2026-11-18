import { MaxWidthContent } from "@/modules/common/components/layouts/MaxWidthContent";
import { Note } from "@/modules/common/components/Note";
import {
  StatisticsDashboardStatus,
  type StatisticsDashboardState,
} from "../utils/resolveStatisticsDashboard";
import { StatisticsDashboardFrame } from "./StatisticsDashboardFrame";

interface Props {
  readonly dashboard: StatisticsDashboardState;
}

export const StatisticsDashboard = ({ dashboard }: Props) => {
  switch (dashboard.status) {
    case StatisticsDashboardStatus.Ready:
      return (
        <StatisticsDashboardFrame
          src={dashboard.src}
          remainingLifetimeInMilliseconds={
            dashboard.remainingLifetimeInMilliseconds
          }
        />
      );

    case StatisticsDashboardStatus.NotConfigured:
      return (
        <MaxWidthContent>
          <Note message="Die Statistiken sind in dieser Umgebung nicht eingerichtet." />
        </MaxWidthContent>
      );

    case StatisticsDashboardStatus.NoCitizen:
      return (
        <MaxWidthContent>
          <Note message="Die Statistiken benötigen einen Citizen, der mit deinem Account verknüpft ist. Dein Account hat keinen verknüpften Citizen." />
        </MaxWidthContent>
      );

    default:
      throw new Error(`Unknown status: ${dashboard satisfies never}`);
  }
};
