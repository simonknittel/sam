"use client";

import dynamic from "next/dynamic";

const AnalyticsCheckbox = dynamic(() => import("./AnalyticsCheckbox"), {
  ssr: false,
});

export const AnalyticsCheckboxLoader = () => {
  return <AnalyticsCheckbox />;
};
