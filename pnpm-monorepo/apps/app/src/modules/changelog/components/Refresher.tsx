"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export const Refresher = () => {
  const router = useRouter();

  /**
   * Re-renders the page once after the server has marked the unseen entries as
   * seen, so the "Neu" badges clear without a manual reload.
   */
  useEffect(() => {
    const timeout = setTimeout(() => {
      router.refresh();
    }, 5000);

    return () => clearTimeout(timeout);
  }, [router]);

  return null;
};
