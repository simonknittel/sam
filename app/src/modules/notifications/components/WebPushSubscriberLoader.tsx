"use client";

import { SkeletonTile } from "@/modules/common/components/SkeletonTile";
import dynamic from "next/dynamic";
import { Suspense } from "react";

const WebPushSubscriberClient = dynamic(
  () =>
    import("./WebPushSubscriberClient").then(
      (mod) => mod.WebPushSubscriberClient,
    ),
  {
    ssr: false,
  },
);

export const WebPushSubscriberLoader = () => {
  return (
    <Suspense fallback={<SkeletonTile />}>
      <WebPushSubscriberClient />
    </Suspense>
  );
};
