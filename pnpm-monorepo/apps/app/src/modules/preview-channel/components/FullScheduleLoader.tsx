"use client";

import { SkeletonTile } from "@/modules/common/components/SkeletonTile";
import dynamic from "next/dynamic";
import type { Schedule } from "../utils/schedule";

const FullSchedule = dynamic(
  () => import("@/modules/preview-channel/components/FullSchedule"),
  {
    ssr: false,
    loading: () => <SkeletonTile className="mt-4 min-h-40 w-full max-w-xl" />,
  },
);

interface Props {
  readonly schedule: Schedule;
}

export const FullScheduleLoader = ({ schedule }: Props) => {
  return <FullSchedule schedule={schedule} />;
};
