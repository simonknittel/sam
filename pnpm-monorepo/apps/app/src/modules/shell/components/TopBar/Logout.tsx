"use client";

import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import { useEndBrowserRuntimeSession } from "@/modules/remote-control-program/runtime/useBrowserRuntime";
import clsx from "clsx";
import { signOut } from "next-auth/react";
import { useState } from "react";
import { RiLogoutCircleRLine } from "react-icons/ri";

interface Props {
  readonly className?: string;
}

export const Logout = ({ className }: Props) => {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const endBrowserRuntimeSession = useEndBrowserRuntimeSession();

  const handleClick = async () => {
    setIsLoggingOut(true);
    endBrowserRuntimeSession();
    await signOut({
      callbackUrl: "/",
    });
  };

  return (
    <Button2
      type="button"
      variant={Button2Variant.Secondary}
      onClick={() => void handleClick()}
      title="Abmelden"
      disabled={isLoggingOut}
      className={clsx(className)}
    >
      {isLoggingOut ? <AsciiSpinner /> : <RiLogoutCircleRLine />}
      Abmelden
    </Button2>
  );
};
