"use client";

import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { RiLoginCircleLine } from "react-icons/ri";
import Button from "./Button";

interface Props {
  readonly activeProviders: string[];
}

export const LoginButtons = ({ activeProviders }: Props) => {
  const [isLoggingIn, setIsLoggingIn] = useState<
    (typeof activeProviders)[number] | null
  >(null);

  const handleClick = async (provider: (typeof activeProviders)[number]) => {
    setIsLoggingIn(provider);
    await signIn(provider);
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
