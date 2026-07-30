"use client";

import dynamic from "next/dynamic";
import type { Schedule } from "../utils/schedule";
import { TileSkeleton } from "./TileSkeleton";

const FullSchedule = dynamic(
  () => import("@/modules/preview-channel/components/FullSchedule"),
  {
    ssr: false,
    loading: () => <TileSkeleton className="mt-4" />,
  },
);

interface Props {
  readonly schedule: Schedule;
}

export const FullScheduleLoader = ({ schedule }: Props) => {
  return <FullSchedule schedule={schedule} />;
};
