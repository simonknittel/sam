"use client";

import clsx from "clsx";
import dynamic from "next/dynamic";
import { Suspense } from "react";

const TimezonesClientContainer = dynamic(
  () =>
    import("./TimezonesClientContainer").then(
      (mod) => mod.TimezonesClientContainer,
    ),
  {
    ssr: false,
  },
);

interface Props {
  readonly className?: string;
}

export const TimezonesClientLoader = ({ className }: Props) => {
  return (
    <Suspense>
      <TimezonesClientContainer className={clsx(className)} />
    </Suspense>
  );
};
