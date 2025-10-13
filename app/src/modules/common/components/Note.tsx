import clsx from "clsx";
import { type ReactNode } from "react";
import { BsExclamationOctagonFill } from "react-icons/bs";
import { FaCheckSquare, FaInfoCircle } from "react-icons/fa";
import { IoIosWarning } from "react-icons/io";

interface Props {
  readonly className?: string;
  readonly message: ReactNode;
  readonly type?: "info" | "success" | "error" | "warning";
  readonly error?: Error;
}

export const Note = ({ className, message, type = "info", error }: Props) => {
  return (
    <div
      className={clsx(
        className,
        "rounded-primary border-t-2 px-4 py-3 flex gap-2 items-start",
        {
          "bg-blue-500/10 border-blue-500": type === "info",
          "bg-green-500/10 border-green-500": type === "success",
          "bg-brand-red-500/10 border-brand-red-500": type === "error",
          "bg-yellow-500/10 border-yellow-500": type === "warning",
        },
      )}
    >
      {type === "info" && (
        <FaInfoCircle className="text-blue-500 grow-1 shrink-0 mt-1" />
      )}
      {type === "success" && (
        <FaCheckSquare className="text-green-500 grow-1 shrink-0 mt-1" />
      )}
      {type === "error" && (
        <BsExclamationOctagonFill className="text-brand-red-500 grow-1 shrink-0 mt-1" />
      )}
      {type === "warning" && (
        <IoIosWarning className="text-yellow-500 grow-1 shrink-0 mt-1" />
      )}

      <div>
        <div className="flex gap-2 items-center">{message}</div>

        {error && (
          <div className="text-neutral-500 mt-4">
            {"digest" in error ? (
              // @ts-expect-error
              <pre>Error digest: {error.digest}</pre>
            ) : (
              <pre>Error message: {error.message}</pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Note;
