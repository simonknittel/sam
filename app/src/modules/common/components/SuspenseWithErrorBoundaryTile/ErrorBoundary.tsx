"use client";

import clsx from "clsx";
import { useTranslations } from "next-intl";
import { type ReactNode } from "react";
import { ErrorBoundary as _ErrorBoundary } from "react-error-boundary";
import { BsExclamationOctagonFill } from "react-icons/bs";
import { Link } from "../Link";

interface Props {
  readonly className?: string;
  readonly children: ReactNode;
}

export const ErrorBoundary = ({ className, children }: Props) => {
  return (
    <_ErrorBoundary
      // @ts-expect-error
      fallbackRender={(props) => <Fallback {...props} className={className} />}
    >
      {children}
    </_ErrorBoundary>
  );
};

interface FallbackProps {
  readonly className?: string;
  readonly error: {
    readonly message: string;
    readonly digest: string;
  };
}

export const Fallback = ({ className, error }: FallbackProps) => {
  const t = useTranslations();

  return (
    <section
      className={clsx(
        "rounded-primary bg-neutral-800/50 border border-red-500",
        className,
      )}
    >
      <div className="flex items-center gap-2 border-b border-white/5 px-4 py-2">
        <BsExclamationOctagonFill className="text-red-800" />
        <h2 className="font-thin text-xl text-red-500">Fehler</h2>
      </div>

      <div className="p-4 lg:p-4">
        <div>
          {t.rich("Common.internalServerError", {
            link: (chunks) => (
              <Link
                href="/app/help/support"
                className="underline text-interaction-500 hover:text-interaction-300 focus-visible:text-interaction-300"
              >
                {chunks}
              </Link>
            ),
          })}
        </div>

        <p className="text-neutral-500 text-sm mt-2">
          Digest: {error.digest ? error.digest : "unknown"}
        </p>
      </div>
    </section>
  );
};
