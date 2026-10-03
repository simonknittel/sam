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
        "flex items-start gap-2 rounded-primary border-t-2 px-4 py-3",
        {
          "border-blue-500 bg-blue-500/10": type === "info",
          "border-green-500 bg-green-500/10": type === "success",
          "border-brand-red-500 bg-brand-red-500/10": type === "error",
          "border-yellow-500 bg-yellow-500/10": type === "warning",
        },
      )}
    >
      {type === "info" && (
        <FaInfoCircle className="mt-1 shrink-0 text-blue-500" />
      )}
      {type === "success" && (
        <FaCheckSquare className="mt-1 shrink-0 text-green-500" />
      )}
      {type === "error" && (
        <BsExclamationOctagonFill className="mt-1 shrink-0 text-brand-red-500" />
      )}
      {type === "warning" && (
        <IoIosWarning className="mt-1 shrink-0 text-yellow-500" />
      )}

      <div className="grow">
        <div className="flex items-center gap-2">{message}</div>

        {error && (
          <div className="mt-4 text-neutral-500">
            {"digest" in error ? (
              // @ts-expect-error TypeScript doesn't narrow Error by the 'digest' in check
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
