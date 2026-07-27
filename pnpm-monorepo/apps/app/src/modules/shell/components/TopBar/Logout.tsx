"use client";

import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import clsx from "clsx";
import { signOut } from "next-auth/react";
import { useState } from "react";
import { FaSpinner } from "react-icons/fa";
import { RiLogoutCircleRLine } from "react-icons/ri";

interface Props {
  readonly className?: string;
}

export const Logout = ({ className }: Props) => {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleClick = async () => {
    setIsLoggingOut(true);
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
      {isLoggingOut ? (
        <FaSpinner className="animate-spin" />
      ) : (
        <RiLogoutCircleRLine />
      )}
      Abmelden
    </Button2>
  );
};
