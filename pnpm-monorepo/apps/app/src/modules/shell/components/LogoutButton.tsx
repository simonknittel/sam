"use client";

import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import { signOut } from "next-auth/react";
import { useState } from "react";
import { RiLogoutCircleRLine } from "react-icons/ri";

interface Props {
  readonly className?: string;
}

export const LogoutButton = ({ className }: Props) => {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleClick = async () => {
    setIsLoggingOut(true);
    await signOut({
      callbackUrl: "/",
    });
  };

  return (
    <Button2
      onClick={() => void handleClick()}
      variant={Button2Variant.Secondary}
      title="Abmelden"
      disabled={isLoggingOut}
      className={className}
    >
      {isLoggingOut ? <AsciiSpinner /> : <RiLogoutCircleRLine />}
    </Button2>
  );
};
