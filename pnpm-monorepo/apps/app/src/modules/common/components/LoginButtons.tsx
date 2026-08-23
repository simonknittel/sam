"use client";

import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { RiLoginCircleLine } from "react-icons/ri";
import Button from "./Button";

interface Props {
  readonly activeProviders: string[];
  /**
   * The validated internal path that the user goes to after the login. The
   * login page validates the path with `validateRedirectTo()`. When the value
   * is `null`, next-auth falls back to its default and the login page then
   * sends the user to the dashboard.
   */
  readonly redirectTo: string | null;
}

export const LoginButtons = ({ activeProviders, redirectTo }: Props) => {
  const [isLoggingIn, setIsLoggingIn] = useState<
    (typeof activeProviders)[number] | null
  >(null);

  const handleClick = async (provider: (typeof activeProviders)[number]) => {
    setIsLoggingIn(provider);
    await signIn(
      provider,
      redirectTo ? { callbackUrl: redirectTo } : undefined,
    );
  };

  return (
    <>
      {activeProviders.includes("discord") && (
        <Button
          onClick={() => void handleClick("discord")}
          disabled={Boolean(isLoggingIn)}
          variant="secondary"
        >
          {isLoggingIn === "discord" ? (
            <AsciiSpinner />
          ) : (
            <>
              Login
              <RiLoginCircleLine />
            </>
          )}
        </Button>
      )}
    </>
  );
};
