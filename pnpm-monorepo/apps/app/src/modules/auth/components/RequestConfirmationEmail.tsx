"use client";

import Button from "@/modules/common/components/Button";
import clsx from "clsx";
import { type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { FaEnvelope, FaSpinner } from "react-icons/fa";

interface Props {
  readonly className?: string;
  readonly children?: ReactNode;
}

export const RequestConfirmationEmailButton = ({
  className,
  children,
}: Props) => {
  const { pending } = useFormStatus();

  return (
    <Button className={clsx(className)} disabled={pending} type="submit">
      {pending ? (
        <FaSpinner className="animate-spin flex-none" />
      ) : (
        <FaEnvelope className="flex-none" />
      )}
      {children}
    </Button>
  );
};

export const RequestConfirmationEmailLink = ({
  className,
  children,
}: Props) => {
  const { pending } = useFormStatus();

  return (
    <button
      className={clsx(className, "underline", {
        "opacity-50 cursor-not-allowed": pending,
      })}
      disabled={pending}
      type="submit"
    >
      {children}
    </button>
  );
};
