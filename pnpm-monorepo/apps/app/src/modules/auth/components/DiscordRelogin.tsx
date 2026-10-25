"use client";

import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import { Button2 } from "@/modules/common/components/Button2";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { FaDiscord } from "react-icons/fa";

/**
 * Signs in with Discord again. The session stays, and the sign-in reads the
 * new status of the two-factor authentication.
 */
export const DiscordRelogin = () => {
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleClick = async () => {
    setIsLoggingIn(true);
    await signIn("discord", { callbackUrl: "/app/dashboard" });
  };

  return (
    <Button2
      type="button"
      onClick={() => void handleClick()}
      disabled={isLoggingIn}
    >
      {isLoggingIn ? <AsciiSpinner /> : <FaDiscord />}
      Erneut mit Discord anmelden
    </Button2>
  );
};
