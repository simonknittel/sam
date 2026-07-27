"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export const Refresher = () => {
  const router = useRouter();

  useEffect(() => {
    setTimeout(() => {
      router.refresh();
    }, 5000);
  });

  return null;
};
