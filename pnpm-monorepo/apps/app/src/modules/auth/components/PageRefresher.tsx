"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

export const PageRefresher = () => {
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);
  const router = useRouter();

  useEffect(() => {
    ref.current = setInterval(() => {
      router.refresh();
    }, 5000);

    return () => {
      if (ref.current) clearInterval(ref.current);
    };
  }, [router]);

  return null;
};
