"use client";

import dynamic from "next/dynamic";
import type { Schedule } from "../utils/schedule";
import { TileSkeleton } from "./TileSkeleton";

const CurrentStatus = dynamic(
  () => import("@/modules/preview-channel/components/CurrentStatus"),
  {
    ssr: false,
    loading: () => <TileSkeleton className="mt-4" />,
  },
);

interface Props {
  readonly schedule: Schedule;
}

export const CurrentStatusLoader = ({ schedule }: Props) => {
  return <CurrentStatus schedule={schedule} />;
};
