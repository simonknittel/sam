"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";

const Bundle = dynamic(() => import("./Bundle").then((mod) => mod.Bundle), {
  ssr: false,
});

type Props = ComponentProps<typeof Bundle> & {
  readonly crashLogAnalyzer?: boolean;
};

export const BundleLoader = ({ crashLogAnalyzer, ...props }: Props) => {
  if (crashLogAnalyzer) throw new Error("Internal Server Error");

  return <Bundle {...props} />;
};
