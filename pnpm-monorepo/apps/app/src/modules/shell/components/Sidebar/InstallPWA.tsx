"use client";

import clsx from "clsx";
import { useEffect, useRef } from "react";
import {
  MdOutlineInstallDesktop,
  MdOutlineInstallMobile,
} from "react-icons/md";

interface Props {
  readonly className?: string;
}

export const InstallPWA = ({ className }: Props) => {
  const installPrompt = useRef<Event | null>(null);

  useEffect(() => {
    window.addEventListener("beforeinstallprompt", (e) => {
      installPrompt.current = e;
    });
  }, []);

  const handleClick = async () => {
    if (!installPrompt.current) return;
    // @ts-expect-error
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    await installPrompt.current.prompt();
  };

  return (
    <button
      className={clsx(
        className,
        "text-neutral-600 text-center text-sm hover:text-neutral-400 active:text-neutral-300 inline-flex gap-2 items-center group",
      )}
      type="button"
      onClick={handleClick}
    >
      App installieren
      <span className="p-1 rounded-secondary border border-neutral-800 group-hover:border-neutral-600 group-active:border-neutral-500">
        <MdOutlineInstallMobile className="lg:hidden" />
        <MdOutlineInstallDesktop className="hidden lg:block" />
      </span>
    </button>
  );
};
