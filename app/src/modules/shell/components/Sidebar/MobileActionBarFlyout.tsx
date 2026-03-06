"use client";

import clsx from "clsx";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { AiFillAppstore } from "react-icons/ai";
import { FaTimes } from "react-icons/fa";

interface Props {
  readonly children?: ReactNode;
}

export const MobileActionBarFlyout = ({ children }: Props) => {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(false);
  }, [pathname]);

  return (
    <>
      <button
        onClick={() => setIsVisible((value) => !value)}
        type="button"
        className="flex flex-col items-center justify-center px-4 h-full active:bg-neutral-700 rounded-secondary"
      >
        {isVisible ? <FaTimes /> : <AiFillAppstore />}
        <span className="text-xs">Apps</span>
      </button>

      <div
        className={clsx(
          "fixed left-0 top-0 bottom-0 w-96 max-w-[90dvw] z-50 flex flex-col bg-neutral-800/90 backdrop-blur-sm shadow-sm overflow-auto transition-transform",
          {
            "-translate-x-full": isVisible === false,
            "translate-x-0": isVisible === true,
          },
        )}
      >
        {children}
      </div>

      {isVisible && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsVisible(false)}
        />
      )}
    </>
  );
};
